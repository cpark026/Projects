#!/usr/bin/env python3
"""
Simple validation script for crash prediction CSV data format.
Ensures data conforms to the expected structure for the Virginia Crash Hot Spot Map.
"""

import csv
import sys
from pathlib import Path

def validate_csv(filepath):
    """Validate CSV file format and data."""
    errors = []
    warnings = []
    
    # Check file exists
    if not Path(filepath).exists():
        print(f"❌ ERROR: File not found: {filepath}")
        return False
    
    # Read and validate CSV
    try:
        with open(filepath, 'r') as f:
            reader = csv.DictReader(f)
            
            # Check required columns
            required_cols = {'lat', 'lon', 'probability', 'hour'}
            optional_cols = {'location_name'}
            
            if not reader.fieldnames:
                errors.append("No header row found")
                return False
            
            header_set = set(reader.fieldnames)
            missing_cols = required_cols - header_set
            
            if missing_cols:
                errors.append(f"Missing required columns: {missing_cols}")
            
            # Validate each row
            row_count = 0
            for i, row in enumerate(reader, start=2):  # Start at 2 (header is 1)
                row_count += 1
                
                # Validate lat
                try:
                    lat = float(row['lat'])
                    if not -90 <= lat <= 90:
                        errors.append(f"Row {i}: Latitude {lat} out of range [-90, 90]")
                    # Check if in Virginia range
                    if not 36.5 <= lat <= 39.5:
                        warnings.append(f"Row {i}: Latitude {lat} outside Virginia range [36.5, 39.5]")
                except (ValueError, KeyError) as e:
                    errors.append(f"Row {i}: Invalid latitude value")
                
                # Validate lon
                try:
                    lon = float(row['lon'])
                    if not -180 <= lon <= 180:
                        errors.append(f"Row {i}: Longitude {lon} out of range [-180, 180]")
                    # Check if in Virginia range
                    if not -83.7 <= lon <= -75.2:
                        warnings.append(f"Row {i}: Longitude {lon} outside Virginia range [-83.7, -75.2]")
                except (ValueError, KeyError) as e:
                    errors.append(f"Row {i}: Invalid longitude value")
                
                # Validate probability
                try:
                    prob = float(row['probability'])
                    if not 0 <= prob <= 1:
                        errors.append(f"Row {i}: Probability {prob} out of range [0, 1]")
                except (ValueError, KeyError) as e:
                    errors.append(f"Row {i}: Invalid probability value")
                
                # Validate hour
                try:
                    hour = int(row['hour'])
                    if not 0 <= hour <= 23:
                        errors.append(f"Row {i}: Hour {hour} out of range [0, 23]")
                except (ValueError, KeyError) as e:
                    errors.append(f"Row {i}: Invalid hour value")
            
            # Print summary
            print(f"\n📊 Validation Summary for: {filepath}")
            print(f"   Rows processed: {row_count}")
            print(f"   Columns found: {', '.join(reader.fieldnames)}")
            
            if errors:
                print(f"\n❌ Errors ({len(errors)}):")
                for error in errors[:10]:  # Show first 10 errors
                    print(f"   - {error}")
                if len(errors) > 10:
                    print(f"   ... and {len(errors) - 10} more errors")
                return False
            
            if warnings:
                print(f"\n⚠️  Warnings ({len(warnings)}):")
                for warning in warnings[:5]:  # Show first 5 warnings
                    print(f"   - {warning}")
                if len(warnings) > 5:
                    print(f"   ... and {len(warnings) - 5} more warnings")
            
            print(f"\n✅ Validation passed! CSV format is correct.")
            return True
            
    except Exception as e:
        print(f"❌ ERROR: Failed to read CSV: {e}")
        return False

if __name__ == "__main__":
    # Default to sample data file
    csv_file = sys.argv[1] if len(sys.argv) > 1 else "data/crash_predictions.csv"
    
    print("=" * 70)
    print("Virginia Crash Hot Spot Map - CSV Data Validator")
    print("=" * 70)
    
    success = validate_csv(csv_file)
    sys.exit(0 if success else 1)
