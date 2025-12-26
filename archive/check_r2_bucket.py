import boto3

# R2 credentials
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

# List all objects in bucket
try:
    response = s3.list_objects_v2(Bucket=bucket_name)

    if 'Contents' in response:
        print(f'Found {len(response["Contents"])} files in bucket:')
        for obj in response['Contents']:
            print(f"  - {obj['Key']} ({obj['Size']} bytes, {obj['LastModified']})")
    else:
        print('Bucket is empty - no files found')
except Exception as e:
    print(f'Error: {e}')
