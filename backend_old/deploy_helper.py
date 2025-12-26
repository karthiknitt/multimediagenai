import subprocess
import sys

# Reconfigure stdout to handle UTF-8 with replacement for unsupported chars
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Run modal deploy
proc = subprocess.run(['modal', 'deploy', 'main.py'], capture_output=True, text=True, encoding='utf-8', errors='replace')

# Print output
print(proc.stdout)
if proc.stderr:
    print(proc.stderr, file=sys.stderr)

# Extract important lines
for line in proc.stdout.splitlines() + proc.stderr.splitlines():
    if any(keyword in line.lower() for keyword in ['view', 'https', 'deployed', 'error', 'app created', 'success']):
        print(f"IMPORTANT: {line}")

sys.exit(proc.returncode)
