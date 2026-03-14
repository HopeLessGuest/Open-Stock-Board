from __future__ import annotations

from datetime import datetime
import socket
from typing import Literal

from requests.exceptions import RequestException


class DataSourceUnavailableError(RuntimeError):
    """Raised when upstream market data source is temporarily unavailable."""


def _to_float(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _import_akshare():
    try:
        import akshare as ak

        return ak
    except Exception as exc:  # pragma: no cover - runtime dependency
        raise RuntimeError("AKShare is not available. Please install akshare and pandas.") from exc


def _raise_data_source_error(source: str, exc: Exception) -> None:
    raise DataSourceUnavailableError(f"Upstream data source unavailable for {source}") from exc


def _normalize_symbol(symbol: str) -> str:
    return str(symbol).strip().split(".")[0]


def fetch_quotes(symbols: list[str]) -> list[dict]:
    ak = _import_akshare()

    clean_symbols = {_normalize_symbol(item) for item in symbols if str(item).strip()}
    if not clean_symbols:
        return []

    try:
        df = ak.stock_zh_a_spot_em()
    except (RequestException, OSError, TimeoutError, ValueError) as exc:
        _raise_data_source_error("quotes", exc)
    if df is None or df.empty:
        return []

    df["代码"] = df["代码"].astype(str).map(_normalize_symbol)
    selected = df[df["代码"].isin(clean_symbols)]

    result: list[dict] = []
    for _, row in selected.iterrows():
        result.append(
            {
                "symbol": row.get("代码", ""),
                "name": row.get("名称", ""),
                "currentPrice": _to_float(row.get("最新价")),
                "change": _to_float(row.get("涨跌额")),
                "changePercent": _to_float(row.get("涨跌幅")),
                "open": _to_float(row.get("今开")),
                "high": _to_float(row.get("最高")),
                "low": _to_float(row.get("最低")),
                "volume": _to_float(row.get("成交量")),
                "amount": _to_float(row.get("成交额")),
                "marketCap": _to_float(row.get("总市值")),
                "pe": _to_float(row.get("市盈率-动态")),
                "pb": _to_float(row.get("市净率")),
            }
        )

    return result


def _period_to_days(range_value: str) -> int:
    mapping = {
        "1d": 1,
        "1w": 5,
        "1m": 30,
        "3m": 90,
        "1y": 365,
        "ytd": max(1, (datetime.now() - datetime(datetime.now().year, 1, 1)).days),
    }
    return mapping.get(range_value, 30)


def fetch_chart(range_value: str, symbol: str | None = None) -> list[dict]:
    ak = _import_akshare()

    # For now we use daily bars as a stable baseline. If symbol is empty, use SH index as market proxy.
    target_symbol = _normalize_symbol(symbol or "000001")
    period_days = _period_to_days(range_value)

    try:
        df = ak.stock_zh_a_hist(
            symbol=target_symbol,
            period="daily",
            adjust="qfq",
        )
    except (RequestException, OSError, TimeoutError, ValueError) as exc:
        _raise_data_source_error("chart", exc)

    if df is None or df.empty:
        return []

    df = df.tail(max(period_days, 1)).copy()
    if df.empty:
        return []

    base_close = _to_float(df.iloc[0].get("收盘"), 1.0)
    if base_close <= 0:
        base_close = 1.0

    points: list[dict] = []
    for _, row in df.iterrows():
        close = _to_float(row.get("收盘"))
        dt = str(row.get("日期"))
        yield_rate = ((close - base_close) / base_close) * 100
        points.append(
            {
                "date": dt,
                "close": round(close, 2),
                "yieldRate": round(yield_rate, 2),
                "yieldAmount": round(100000 * yield_rate / 100, 2),
            }
        )

    return points


def fetch_news(limit: int = 20) -> list[dict]:
    ak = _import_akshare()

    try:
        df = ak.stock_info_global_em()
    except (RequestException, OSError, TimeoutError, ValueError) as exc:
        _raise_data_source_error("news", exc)
    if df is None or df.empty:
        return []

    df = df.head(limit)
    items: list[dict] = []
    for idx, row in df.iterrows():
        title = str(row.get("标题", "")).strip()
        summary = str(row.get("摘要", "")).strip() or title
        source = str(row.get("来源", "东方财富")).strip() or "东方财富"
        publish_time = str(row.get("发布时间", "")).strip() or "刚刚"
        detail_url = str(row.get("链接", "")).strip() or None

        items.append(
            {
                "id": f"news-{idx}",
                "title": title,
                "summary": summary,
                "source": source,
                "publishTime": publish_time,
                "relatedSymbols": None,
                "sentiment": "neutral",
                "category": "market",
                "detailUrl": detail_url,
            }
        )

    return items


def fetch_industries(limit: int = 20) -> list[dict]:
    ak = _import_akshare()

    try:
        df = ak.stock_board_industry_name_em()
    except (RequestException, OSError, TimeoutError, ValueError) as exc:
        _raise_data_source_error("industries", exc)
    if df is None or df.empty:
        return []

    df = df.head(limit)

    items: list[dict] = []
    for _, row in df.iterrows():
        items.append(
            {
                "name": str(row.get("板块名称", "未知行业")),
                "changePercent": _to_float(row.get("涨跌幅")),
                "change": _to_float(row.get("涨跌额")),
                "amount": _to_float(row.get("成交额")),
                "leadingStock": str(row.get("领涨股票", "--")),
                "leadingStockChange": _to_float(row.get("领涨股票-涨跌幅")),
            }
        )

    return items


def check_data_source_health(timeout_sec: float = 1.5) -> dict:
    try:
        _import_akshare()
        akshare_available = True
    except RuntimeError:
        return {
            "akshareAvailable": False,
            "upstreamReachable": False,
            "details": "AKShare import failed",
        }

    try:
        with socket.create_connection(("82.push2.eastmoney.com", 443), timeout=timeout_sec):
            upstream_reachable = True
    except OSError:
        upstream_reachable = False

    probes: dict[str, bool] = {}
    probe_messages: dict[str, str] = {}

    probe_cases = {
        "quotes": lambda: fetch_quotes(["600519"]),
        "chart": lambda: fetch_chart("1d", "600519"),
        "news": lambda: fetch_news(1),
        "industries": lambda: fetch_industries(1),
    }
    for probe_name, runner in probe_cases.items():
        try:
            runner()
            probes[probe_name] = True
        except DataSourceUnavailableError as exc:
            probes[probe_name] = False
            probe_messages[probe_name] = str(exc)
        except Exception as exc:  # pragma: no cover - defensive
            probes[probe_name] = False
            probe_messages[probe_name] = f"unexpected error: {exc.__class__.__name__}"

    return {
        "akshareAvailable": akshare_available,
        "upstreamReachable": upstream_reachable,
        "details": "ok" if upstream_reachable else "Eastmoney upstream unreachable",
        "probes": probes,
        "probeMessages": probe_messages,
        "allProbesPassed": all(probes.values()) if probes else False,
    }
