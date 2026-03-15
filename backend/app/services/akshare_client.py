from __future__ import annotations

from datetime import datetime
import re
import socket
import time
from threading import Lock
from typing import Literal

import requests
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


def _ensure_host_reachable(host: str, source: str, timeout_sec: float = 1.5) -> None:
    try:
        with socket.create_connection((host, 443), timeout=timeout_sec):
            return
    except OSError as exc:
        _raise_data_source_error(source, exc)


def _normalize_symbol(symbol: str) -> str:
    return str(symbol).strip().split(".")[0]


def _normalize_6digit_symbol(value: str) -> str:
    text = str(value or "").strip()
    match = re.search(r"(\d{6})", text)
    return match.group(1) if match else _normalize_symbol(text)


def _to_exchange_symbol(symbol: str) -> str:
    clean = _normalize_6digit_symbol(symbol)
    if clean.startswith(("6", "9")):
        return f"sh{clean}"
    if clean.startswith(("0", "2", "3")):
        return f"sz{clean}"
    if clean.startswith(("4", "8")):
        return f"bj{clean}"
    return clean


def _format_ts(ts: str) -> str:
    raw = re.sub(r"\D", "", str(ts or ""))
    if len(raw) >= 12:
        return f"{raw[0:4]}-{raw[4:6]}-{raw[6:8]}T{raw[8:10]}:{raw[10:12]}:00"
    if len(raw) == 8:
        return f"{raw[0:4]}-{raw[4:6]}-{raw[6:8]}"
    return str(ts)


def _fetch_quotes_tx(symbols: set[str]) -> list[dict]:
    params = ",".join(_to_exchange_symbol(item) for item in sorted(symbols))
    if not params:
        return []

    response = requests.get(f"https://qt.gtimg.cn/q={params}", timeout=8)
    response.raise_for_status()

    result: list[dict] = []
    for line in response.text.split(";"):
        line = line.strip()
        if not line or '="' not in line:
            continue

        _, payload = line.split('="', 1)
        payload = payload.rstrip('"')
        parts = payload.split("~")
        if len(parts) < 6:
            continue

        symbol = _normalize_6digit_symbol(parts[2])
        if symbol not in symbols:
            continue

        current_price = _to_float(parts[3])
        prev_close = _to_float(parts[4])
        open_price = _to_float(parts[5])
        change = current_price - prev_close
        change_percent = (change / prev_close * 100) if prev_close > 0 else 0

        high = _to_float(parts[33]) if len(parts) > 33 else 0
        low = _to_float(parts[34]) if len(parts) > 34 else 0
        volume = _to_float(parts[6]) if len(parts) > 6 else 0

        result.append(
            {
                "symbol": symbol,
                "name": parts[1] if len(parts) > 1 else symbol,
                "currentPrice": round(current_price, 2),
                "change": round(change, 2),
                "changePercent": round(change_percent, 2),
                "open": round(open_price, 2),
                "high": round(high, 2),
                "low": round(low, 2),
                "volume": volume,
                "amount": 0,
                "marketCap": 0,
                "pe": 0,
                "pb": 0,
            }
        )

    return result


def _fetch_chart_tx(range_value: str, symbol: str | None = None) -> list[dict]:
    tx_symbol = _to_exchange_symbol(symbol or "000001") if symbol else "sh000001"
    period_days = _period_to_days(range_value)

    # 1D: use minute timeline for proper intraday granularity.
    if range_value == "1d":
        minute_url = f"https://ifzq.gtimg.cn/appstock/app/minute/query?code={tx_symbol}"
        minute_resp = requests.get(minute_url, timeout=10)
        minute_resp.raise_for_status()
        minute_payload = minute_resp.json()

        data_node = minute_payload.get("data", {}).get(tx_symbol, {})
        minute_rows = data_node.get("data", {}).get("data", [])
        if not minute_rows:
            return []

        qt_arr = data_node.get("qt", {}).get(tx_symbol, [])
        date_token = ""
        if isinstance(qt_arr, list) and len(qt_arr) > 30:
            date_token = str(qt_arr[30])[:8]
        if len(date_token) != 8:
            date_token = datetime.now().strftime("%Y%m%d")

        raw_points: list[tuple[str, float]] = []
        for row in minute_rows:
            parts = str(row).split()
            if len(parts) < 2:
                continue
            hm = parts[0]
            if len(hm) != 4 or not hm.isdigit():
                continue
            close = _to_float(parts[1], 0)
            if close <= 0:
                continue
            ts = f"{date_token}{hm}"
            raw_points.append((_format_ts(ts), close))

        if not raw_points:
            return []

        base_close = raw_points[0][1]
        points: list[dict] = []
        for ts, close in raw_points:
            yield_rate = ((close - base_close) / base_close) * 100 if base_close > 0 else 0
            points.append(
                {
                    "date": ts,
                    "close": round(close, 2),
                    "yieldRate": round(yield_rate, 2),
                    "yieldAmount": round(100000 * yield_rate / 100, 2),
                }
            )
        return points

    # 1W: use 30-minute bars for better readability and smoothness.
    if range_value == "1w":
        bars = 64  # approx 8 bars/day * 5 trading days + buffer
        mkline_url = f"https://ifzq.gtimg.cn/appstock/app/kline/mkline?param={tx_symbol},m30,,{bars}"
        mkline_resp = requests.get(mkline_url, timeout=10)
        mkline_resp.raise_for_status()
        mkline_payload = mkline_resp.json()

        data_node = mkline_payload.get("data", {}).get(tx_symbol, {})
        rows = data_node.get("m30", [])
        if not rows:
            return []

        close_values = [_to_float(item[2], 0) for item in rows]
        close_values = [item for item in close_values if item > 0]
        if not close_values:
            return []

        base_close = close_values[0]
        points: list[dict] = []
        for row in rows:
            ts = _format_ts(row[0])
            close = _to_float(row[2], base_close)
            if close <= 0:
                continue
            yield_rate = ((close - base_close) / base_close) * 100 if base_close > 0 else 0
            points.append(
                {
                    "date": ts,
                    "close": round(close, 2),
                    "yieldRate": round(yield_rate, 2),
                    "yieldAmount": round(100000 * yield_rate / 100, 2),
                }
            )
        return points

    # 1M+ ranges: keep daily bars.
    bars = max(30, min(520, period_days * 2))
    day_url = f"https://ifzq.gtimg.cn/appstock/app/fqkline/get?param={tx_symbol},day,,,{bars},qfq"
    day_resp = requests.get(day_url, timeout=10)
    day_resp.raise_for_status()

    payload = day_resp.json()
    data_node = payload.get("data", {}).get(tx_symbol, {})
    rows = data_node.get("qfqday") or data_node.get("day") or []
    if not rows:
        return []

    rows = rows[-max(period_days, 1):]
    close_values = [_to_float(item[2], 0) for item in rows]
    close_values = [item for item in close_values if item > 0]
    if not close_values:
        return []

    base_close = close_values[0]
    points: list[dict] = []
    for row in rows:
        date = _format_ts(row[0])
        close = _to_float(row[2], base_close)
        yield_rate = ((close - base_close) / base_close) * 100 if base_close > 0 else 0
        points.append(
            {
                "date": date,
                "close": round(close, 2),
                "yieldRate": round(yield_rate, 2),
                "yieldAmount": round(100000 * yield_rate / 100, 2),
            }
        )

    return points


CHART_CACHE_TTL_SEC = 15
_chart_cache: dict[str, tuple[float, list[dict]]] = {}
_chart_cache_lock = Lock()


def _get_cached_chart(cache_key: str) -> list[dict] | None:
    now = time.time()
    with _chart_cache_lock:
        cached = _chart_cache.get(cache_key)
        if not cached:
            return None
        ts, data = cached
        if now - ts > CHART_CACHE_TTL_SEC:
            _chart_cache.pop(cache_key, None)
            return None
        return data.copy()


def _set_cached_chart(cache_key: str, data: list[dict]) -> None:
    with _chart_cache_lock:
        _chart_cache[cache_key] = (time.time(), data.copy())


def fetch_quotes(symbols: list[str]) -> list[dict]:
    clean_symbols = {_normalize_6digit_symbol(item) for item in symbols if str(item).strip()}
    if not clean_symbols:
        return []

    # Primary source: Tencent quote API, more stable in restricted Eastmoney networks.
    try:
        data = _fetch_quotes_tx(clean_symbols)
        if data:
            return data
    except Exception:
        pass

    # Fallback source: AKShare Eastmoney snapshot.
    ak = _import_akshare()
    try:
        df = ak.stock_zh_a_spot_em()
    except Exception as exc:
        _raise_data_source_error("quotes", exc)

    if df is None or df.empty:
        return []

    df["代码"] = df["代码"].astype(str).map(_normalize_6digit_symbol)
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
    # Use daily bars as a stable baseline. If symbol is empty, use SH index as market proxy.
    target_symbol = _normalize_symbol(symbol) if symbol else ""
    target_symbol = target_symbol or None
    cache_key = f"{range_value}:{target_symbol or 'market_proxy'}"
    cached = _get_cached_chart(cache_key)
    if cached is not None:
        return cached

    # Primary source: Tencent K-line API.
    try:
        points = _fetch_chart_tx(range_value=range_value, symbol=target_symbol)
        if points:
            _set_cached_chart(cache_key, points)
            return points
    except Exception:
        pass

    # Fallback source: AKShare Eastmoney K-line APIs.
    ak = _import_akshare()
    period_days = _period_to_days(range_value)
    try:
        if target_symbol:
            df = ak.stock_zh_a_hist(
                symbol=target_symbol,
                period="daily",
                adjust="qfq",
            )
        else:
            df = ak.index_zh_a_hist(
                symbol="000001",
                period="daily",
            )
    except Exception as exc:
        _raise_data_source_error("chart", exc)

    if df is None or df.empty:
        return []

    df = df.tail(max(period_days, 1)).copy()
    if df.empty:
        return []

    base_close = _to_float(df.iloc[0].get("收盘", df.iloc[0].get("close")), 1.0)
    if base_close <= 0:
        base_close = 1.0

    points: list[dict] = []
    for _, row in df.iterrows():
        close = _to_float(row.get("收盘", row.get("close")))
        dt = str(row.get("日期", row.get("date")))
        yield_rate = ((close - base_close) / base_close) * 100
        points.append(
            {
                "date": dt,
                "close": round(close, 2),
                "yieldRate": round(yield_rate, 2),
                "yieldAmount": round(100000 * yield_rate / 100, 2),
            }
        )

    _set_cached_chart(cache_key, points)
    return points


def fetch_news(limit: int = 20) -> list[dict]:
    ak = _import_akshare()
    _ensure_host_reachable("np-weblist.eastmoney.com", "news")

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
    _ensure_host_reachable("17.push2.eastmoney.com", "industries")

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

    probe_hosts = {
        "quotes": "82.push2.eastmoney.com",
        "chart": "push2his.eastmoney.com",
        "news": "np-weblist.eastmoney.com",
        "industries": "17.push2.eastmoney.com",
    }
    probes: dict[str, bool] = {}
    for probe_name, host in probe_hosts.items():
        try:
            with socket.create_connection((host, 443), timeout=timeout_sec):
                probes[probe_name] = True
        except OSError:
            probes[probe_name] = False

    upstream_reachable = any(probes.values())

    # Functional probes are more reliable than raw TCP checks under anti-bot network policies.
    functional_probes = {
        "quotes": False,
        "chart": False,
    }
    try:
        functional_probes["quotes"] = len(fetch_quotes(["600519"])) > 0
    except Exception:
        functional_probes["quotes"] = False

    try:
        functional_probes["chart"] = len(fetch_chart("1m", "600519")) > 0
    except Exception:
        functional_probes["chart"] = False

    functional_ready = all(functional_probes.values())

    return {
        "akshareAvailable": akshare_available,
        "upstreamReachable": upstream_reachable,
        "details": "ok" if functional_ready else "Data source functional probe failed",
        "probes": probes,
        "allProbesPassed": all(probes.values()) if probes else False,
        "functionalProbes": functional_probes,
        "functionalReady": functional_ready,
    }
