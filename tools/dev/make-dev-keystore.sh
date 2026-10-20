#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Creates the Android keystore that signs the development variant (app.flane.dev)
# and the credentials.json EAS reads (credentialsSource: local). Both files stay
# out of git (.gitignore). Losing them only means regenerating and reinstalling
# the development app. The release keystore is a separate matter (T5.4).
# Usage: tools/dev/make-dev-keystore.sh   (idempotent: does nothing if present)
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
app="$root/app"
dir="$app/credentials"
keystore="$dir/flane-dev.jks"
credentials="$app/credentials.json"
alias="flane-dev"

if [ -f "$keystore" ] && [ -f "$credentials" ]; then
  echo "dev keystore: already present ($keystore)"
  exit 0
fi

command -v keytool >/dev/null 2>&1 || { echo "keytool (Java) is required." >&2; exit 1; }

mkdir -p "$dir"
chmod 700 "$dir"
password="$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')"

keytool -genkeypair -v \
  -keystore "$keystore" -storetype PKCS12 \
  -alias "$alias" -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$password" -keypass "$password" \
  -dname "CN=Flane dev, O=Flane, C=FR" >/dev/null 2>&1

cat > "$credentials" <<JSON
{
  "android": {
    "keystore": {
      "keystorePath": "credentials/flane-dev.jks",
      "keystorePassword": "$password",
      "keyAlias": "$alias",
      "keyPassword": "$password"
    }
  }
}
JSON
chmod 600 "$credentials" "$keystore"
echo "dev keystore: created ($keystore), credentials in $credentials (both ignored by git)"
