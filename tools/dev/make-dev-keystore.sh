#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Creates the Android keystore that signs the development variant (app.flane.dev)
# and the credentials.json EAS reads (credentialsSource: local). Both files stay
# out of git (.gitignore). Losing them only means regenerating and reinstalling
# the development app. The release keystore is a separate matter (T5.4).
# The keystore is PKCS12 (the format EAS expects); the .jks name is EAS's convention.
# Usage: tools/dev/make-dev-keystore.sh   (idempotent: does nothing if both files exist)
set -euo pipefail
umask 077

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
if [ -f "$keystore" ] || [ -f "$credentials" ]; then
  echo "dev keystore: only one of $keystore and $credentials exists. Remove both, then run again." >&2
  exit 1
fi

for tool in keytool python3; do
  command -v "$tool" >/dev/null 2>&1 || { echo "$tool is required." >&2; exit 1; }
done

mkdir -p "$dir"
chmod 700 "$dir"
FLANE_DEV_KEYSTORE_PASSWORD="$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')"
export FLANE_DEV_KEYSTORE_PASSWORD
password="$FLANE_DEV_KEYSTORE_PASSWORD"

# The password is read from the environment, so it never appears in `ps`.
keytool -genkeypair \
  -keystore "$keystore" -storetype PKCS12 \
  -alias "$alias" -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass:env FLANE_DEV_KEYSTORE_PASSWORD -keypass:env FLANE_DEV_KEYSTORE_PASSWORD \
  -dname "CN=Flane dev, O=Flane, C=FR" >/dev/null

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
