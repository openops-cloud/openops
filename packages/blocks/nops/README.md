# blocks-nops

This library was generated with [Nx](https://nx.dev).

## Request Signatures (optional)

If your nOps API key requires signature verification, paste the pre-generated signature in the `Signature (optional)` field. We’ll send it as the `x-nops-signature` header.

Signature message format (for external generation): `<client_id>.<YYYY-MM-DD>.<urlPath>`

### curl example

```bash
curl -X GET "https://app.nops.io/c/admin/projectaws/organization_accounts/" \
  -H "X-Nops-Api-Key: <YOUR_API_KEY>" \
  -H "x-nops-signature: <BASE64_SIGNATURE>"
```

### Python generation example (external)

```python
from Crypto.Signature import pkcs1_15
from Crypto.Hash import SHA256
from Crypto.PublicKey import RSA
from datetime import datetime
import binascii

client_id = "4725"  # extracted from API key prefix
private_key_pem = open("private_key.pem", "rb").read()
date_str = datetime.now().strftime("%Y-%m-%d")
url_path = "/c/admin/projectaws/organization_accounts/"

message = f"{client_id}.{date_str}.{url_path}"
key = RSA.import_key(private_key_pem)
sha_bytes = SHA256.new(message.encode())
signature = pkcs1_15.new(key).sign(sha_bytes)
signature_b64 = binascii.b2a_base64(signature)[:-1].decode("utf-8")
print(signature_b64)
```

## Building

Run `nx build blocks-nops` to build the library.

## Running unit tests

Run `nx test blocks-nops` to execute the unit tests via [Jest](https://jestjs.io).
