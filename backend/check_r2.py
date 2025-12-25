"""Check if images are being generated in R2"""
import boto3
from datetime import datetime, timedelta

# R2 credentials from previous logs
account_id = '27ff2bec75ad03d16fb004d0c44b8ce1'
access_key = 'b8e1415cc494945480926c31b11596f4'
secret_key = 'a6b837277577c97b888d0fe45f5b6cdd7fd2ef64dba6f5a10ac4755dd44237e8'
bucket_name = 'img-vid-aud'

# Create S3 client for R2
s3 = boto3.client(
    's3',
    endpoint_url=f'https://{account_id}.r2.cloudflarestorage.com',
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    region_name='auto'
)

print(f"Checking bucket: {bucket_name}")
print(f"Looking for files uploaded in the last 5 minutes...\n")

try:
    # List all objects
    response = s3.list_objects_v2(Bucket=bucket_name, Prefix='images/')

    if 'Contents' in response:
        # Filter for recent files (last 5 minutes)
        five_mins_ago = datetime.now(response['Contents'][0]['LastModified'].tzinfo) - timedelta(minutes=5)
        recent_files = [obj for obj in response['Contents'] if obj['LastModified'] > five_mins_ago]

        if recent_files:
            print(f"Found {len(recent_files)} recent file(s):\n")
            for obj in sorted(recent_files, key=lambda x: x['LastModified'], reverse=True):
                print(f"  - {obj['Key']}")
                print(f"    Size: {obj['Size']} bytes")
                print(f"    Modified: {obj['LastModified']}")
                print()
        else:
            print("No files uploaded in the last 5 minutes.")
            print(f"\nTotal files in bucket: {len(response['Contents'])}")
    else:
        print('Bucket is empty - no files found')

except Exception as e:
    print(f'Error: {e}')
