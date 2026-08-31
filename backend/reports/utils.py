"""
Report Utilities for Anonymized Aggregate Reporting
Helper functions for data processing, validation, and formatting.
"""

import re
import hashlib
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union
from decimal import Decimal
import pandas as pd
import numpy as np


def anonymize_data(data: List[Dict[str, Any]], fields_to_anonymize: List[str] = None) -> List[Dict[str, Any]]:
    """
    Anonymize sensitive data by removing or hashing identifiable fields.
    
    Args:
        data: List of data dictionaries
        fields_to_anonymize: Fields to anonymize (default: ['user_id', 'email', 'name', 'phone'])
    
    Returns:
        Anonymized data list
    """
    fields_to_anonymize = fields_to_anonymize or ['user_id', 'email', 'name', 'phone', 'username']
    
    anonymized_data = []
    for record in data:
        anonymized_record = {}
        for key, value in record.items():
            if key in fields_to_anonymize:
                if value:
                    anonymized_record[key] = hash_value(str(value))
                else:
                    anonymized_record[key] = None
            else:
                anonymized_record[key] = value
        anonymized_data.append(anonymized_record)
    
    return anonymized_data


def hash_value(value: str) -> str:
    """
    Hash a value for anonymization.
    
    Args:
        value: String to hash
    
    Returns:
        Hashed value (first 12 characters)
    """
    return hashlib.sha256(value.encode()).hexdigest()[:12]


def calculate_percentiles(data: List[float], percentiles: List[int] = None) -> Dict[int, float]:
    """
    Calculate percentiles for a list of values.
    
    Args:
        data: List of numeric values
        percentiles: List of percentiles to calculate (default: [10, 25, 50, 75, 90, 95, 99])
    
    Returns:
        Dictionary of percentile -> value
    """
    percentiles = percentiles or [10, 25, 50, 75, 90, 95, 99]
    
    if not data:
        return {p: 0 for p in percentiles}
    
    sorted_data = sorted(data)
    n = len(sorted_data)
    
    results = {}
    for p in percentiles:
        idx = int((p / 100) * n)
        results[p] = sorted_data[min(idx, n - 1)]
    
    return results


def calculate_statistics(data: List[float]) -> Dict[str, float]:
    """
    Calculate basic statistics for a list of values.
    
    Args:
        data: List of numeric values
    
    Returns:
        Dictionary with statistics
    """
    if not data:
        return {
            'mean': 0,
            'median': 0,
            'mode': 0,
            'min': 0,
            'max': 0,
            'std': 0,
            'variance': 0,
            'range': 0,
            'count': 0
        }
    
    data_array = np.array(data)
    
    # Calculate mode (most common value)
    try:
        from scipy import stats
        mode = stats.mode(data_array)[0][0] if len(data) > 0 else 0
    except:
        # Fallback: find most common value
        from collections import Counter
        counter = Counter(data)
        mode = counter.most_common(1)[0][0] if counter else 0
    
    return {
        'mean': float(np.mean(data_array)),
        'median': float(np.median(data_array)),
        'mode': float(mode),
        'min': float(np.min(data_array)),
        'max': float(np.max(data_array)),
        'std': float(np.std(data_array)),
        'variance': float(np.var(data_array)),
        'range': float(np.max(data_array) - np.min(data_array)),
        'count': len(data)
    }


def calculate_growth_rate(current: float, previous: float) -> float:
    """
    Calculate growth rate percentage.
    
    Args:
        current: Current value
        previous: Previous value
    
    Returns:
        Growth rate percentage
    """
    if previous == 0:
        return 0
    return ((current - previous) / previous) * 100


def calculate_trend(data: List[float]) -> Dict[str, Any]:
    """
    Analyze trend in a time series.
    
    Args:
        data: List of numeric values in chronological order
    
    Returns:
        Trend analysis dictionary
    """
    if len(data) < 2:
        return {
            'direction': 'stable',
            'change_percentage': 0,
            'slope': 0,
            'volatility': 0
        }
    
    # Calculate trend using linear regression
    x = np.arange(len(data))
    y = np.array(data)
    
    slope, intercept = np.polyfit(x, y, 1)
    
    # Determine direction
    if slope > 0.01:
        direction = 'increasing'
    elif slope < -0.01:
        direction = 'decreasing'
    else:
        direction = 'stable'
    
    # Calculate volatility (standard deviation of changes)
    changes = np.diff(data)
    volatility = np.std(changes) if len(changes) > 0 else 0
    
    # Calculate percentage change
    first_value = data[0]
    last_value = data[-1]
    change_percentage = ((last_value - first_value) / first_value * 100) if first_value != 0 else 0
    
    return {
        'direction': direction,
        'change_percentage': float(change_percentage),
        'slope': float(slope),
        'volatility': float(volatility)
    }


def detect_seasonal_patterns(data: List[float], period: int = 7) -> Dict[str, Any]:
    """
    Detect seasonal patterns in time series data.
    
    Args:
        data: List of numeric values
        period: Seasonality period (default: 7 days)
    
    Returns:
        Seasonal pattern analysis
    """
    if len(data) < period * 2:
        return {
            'has_seasonality': False,
            'pattern': [],
            'strength': 0
        }
    
    # Calculate seasonal components
    n = len(data)
    seasonal = []
    for i in range(period):
        indices = list(range(i, n, period))
        if indices:
            values = [data[idx] for idx in indices if idx < len(data)]
            seasonal.append(np.mean(values) if values else 0)
    
    # Normalize seasonal pattern
    if seasonal and max(seasonal) > 0:
        seasonal = [s / max(seasonal) for s in seasonal]
    
    # Calculate strength (variance explained by seasonality)
    detrended = np.array(data) - np.mean(data)
    seasonal_std = np.std(seasonal) if seasonal else 0
    total_std = np.std(detrended)
    
    strength = seasonal_std / total_std if total_std > 0 else 0
    
    return {
        'has_seasonality': strength > 0.3,
        'pattern': seasonal,
        'strength': float(strength),
        'period': period
    }


def generate_date_range(start_date: datetime, end_date: datetime, interval: str = 'day') -> List[datetime]:
    """
    Generate a list of dates between start and end.
    
    Args:
        start_date: Start date
        end_date: End date
        interval: Interval ('day', 'week', 'month')
    
    Returns:
        List of datetime objects
    """
    dates = []
    current = start_date
    
    while current <= end_date:
        dates.append(current)
        
        if interval == 'day':
            current += timedelta(days=1)
        elif interval == 'week':
            current += timedelta(weeks=1)
        elif interval == 'month':
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)
        else:
            current += timedelta(days=1)
    
    return dates


def aggregate_by_date(
    data: List[Dict[str, Any]],
    date_field: str,
    value_field: str,
    aggregation: str = 'sum'
) -> Dict[datetime, float]:
    """
    Aggregate data by date.
    
    Args:
        data: List of data dictionaries
        date_field: Field name for date
        value_field: Field name for value
        aggregation: Aggregation method ('sum', 'avg', 'count', 'min', 'max')
    
    Returns:
        Dictionary of date -> aggregated value
    """
    result = {}
    
    for record in data:
        date = record.get(date_field)
        value = record.get(value_field, 0)
        
        if not date:
            continue
        
        if isinstance(date, str):
            date = datetime.fromisoformat(date)
        
        if date not in result:
            result[date] = []
        result[date].append(value)
    
    # Apply aggregation
    aggregated = {}
    for date, values in result.items():
        if aggregation == 'sum':
            aggregated[date] = sum(values)
        elif aggregation == 'avg':
            aggregated[date] = sum(values) / len(values) if values else 0
        elif aggregation == 'count':
            aggregated[date] = len(values)
        elif aggregation == 'min':
            aggregated[date] = min(values) if values else 0
        elif aggregation == 'max':
            aggregated[date] = max(values) if values else 0
        else:
            aggregated[date] = sum(values)
    
    return aggregated


def filter_anomalies(data: List[float], z_score_threshold: float = 3.0) -> List[float]:
    """
    Filter anomalies from data using Z-score method.
    
    Args:
        data: List of numeric values
        z_score_threshold: Z-score threshold (default: 3.0)
    
    Returns:
        Filtered list without anomalies
    """
    if len(data) < 3:
        return data
    
    data_array = np.array(data)
    mean = np.mean(data_array)
    std = np.std(data_array)
    
    if std == 0:
        return data
    
    z_scores = np.abs((data_array - mean) / std)
    filtered = [data[i] for i in range(len(data)) if z_scores[i] < z_score_threshold]
    
    return filtered


def detect_outliers(data: List[float], method: str = 'iqr') -> List[int]:
    """
    Detect outliers in data.
    
    Args:
        data: List of numeric values
        method: Detection method ('iqr', 'zscore')
    
    Returns:
        List of indices of outliers
    """
    if len(data) < 3:
        return []
    
    data_array = np.array(data)
    outliers = []
    
    if method == 'iqr':
        q1 = np.percentile(data_array, 25)
        q3 = np.percentile(data_array, 75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        for i, value in enumerate(data):
            if value < lower_bound or value > upper_bound:
                outliers.append(i)
    
    elif method == 'zscore':
        mean = np.mean(data_array)
        std = np.std(data_array)
        
        if std == 0:
            return []
        
        for i, value in enumerate(data):
            z_score = (value - mean) / std
            if abs(z_score) > 3:
                outliers.append(i)
    
    return outliers


def convert_to_serializable(obj: Any) -> Any:
    """
    Convert non-serializable objects to JSON serializable format.
    
    Args:
        obj: Object to convert
    
    Returns:
        JSON serializable object
    """
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, pd.Series):
        return obj.to_dict()
    if isinstance(obj, pd.DataFrame):
        return obj.to_dict('records')
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    if hasattr(obj, '__dict__'):
        return {k: convert_to_serializable(v) for k, v in obj.__dict__.items()}
    return obj


def validate_email(email: str) -> bool:
    """
    Validate email format.
    
    Args:
        email: Email string
    
    Returns:
        True if valid
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_date_range(start_date: datetime, end_date: datetime) -> bool:
    """
    Validate that start date is before end date.
    
    Args:
        start_date: Start date
        end_date: End date
    
    Returns:
        True if valid
    """
    return start_date <= end_date


def format_file_size(size_in_bytes: int) -> str:
    """
    Format file size in human readable format.
    
    Args:
        size_in_bytes: File size in bytes
    
    Returns:
        Human readable file size
    """
    if size_in_bytes < 1024:
        return f"{size_in_bytes} B"
    elif size_in_bytes < 1024 * 1024:
        return f"{size_in_bytes / 1024:.1f} KB"
    elif size_in_bytes < 1024 * 1024 * 1024:
        return f"{size_in_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_in_bytes / (1024 * 1024 * 1024):.1f} GB"


def generate_random_id(length: int = 8) -> str:
    """
    Generate a random ID.
    
    Args:
        length: Length of the ID
    
    Returns:
        Random ID string
    """
    import random
    import string
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


def safe_divide(a: Union[int, float], b: Union[int, float]) -> float:
    """
    Safely divide two numbers, returning 0 if denominator is 0.
    
    Args:
        a: Numerator
        b: Denominator
    
    Returns:
        Division result or 0
    """
    return float(a) / float(b) if b != 0 else 0.0


def chunk_list(data: List[Any], chunk_size: int) -> List[List[Any]]:
    """
    Split a list into chunks of specified size.
    
    Args:
        data: List to chunk
        chunk_size: Size of each chunk
    
    Returns:
        List of chunks
    """
    return [data[i:i + chunk_size] for i in range(0, len(data), chunk_size)]


def merge_dicts(dict1: Dict[str, Any], dict2: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge two dictionaries recursively.
    
    Args:
        dict1: First dictionary
        dict2: Second dictionary
    
    Returns:
        Merged dictionary
    """
    result = dict1.copy()
    
    for key, value in dict2.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = merge_dicts(result[key], value)
        else:
            result[key] = value
    
    return result


def flatten_dict(nested_dict: Dict[str, Any], parent_key: str = '', sep: str = '.') -> Dict[str, Any]:
    """
    Flatten a nested dictionary.
    
    Args:
        nested_dict: Nested dictionary
        parent_key: Parent key for recursion
        sep: Separator for nested keys
    
    Returns:
        Flattened dictionary
    """
    items = []
    for key, value in nested_dict.items():
        new_key = f"{parent_key}{sep}{key}" if parent_key else key
        
        if isinstance(value, dict):
            items.extend(flatten_dict(value, new_key, sep=sep).items())
        else:
            items.append((new_key, value))
    
    return dict(items)