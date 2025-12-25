import modal

# Get the call directly
call_id = "fc-01KDAPYNNM89T8D6RH91WSV798"

try:
    call = modal.FunctionCall.from_id(call_id)
    print(f"Call ID: {call_id}")
    print(f"Call status: Checking...")

    # Try to get result with short timeout
    try:
        result = call.get(timeout=2)
        print("✓ COMPLETED!")
        print(f"Result: {result}")
    except TimeoutError:
        print("⏳ Still running...")
except Exception as e:
    print(f"Error: {e}")
