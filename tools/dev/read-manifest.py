# SPDX-License-Identifier: AGPL-3.0-or-later
# Minimal Android binary XML (AXML) reader, with no dependency: prints the
# uses-permission entries, application flags, exported components and intent
# schemes of an APK. Usage: python3 -I tools/dev/read-manifest.py <file.apk>
# Used to check the permission list of each built APK (docs/SECURITE.md).
import struct, sys, zipfile

def read_strings(data, off):
    t, hs, size, count, style_count, flags, strings_start, _ = struct.unpack_from('<HHIIIIII', data, off)
    utf8 = bool(flags & 0x100)
    offsets = struct.unpack_from('<%dI' % count, data, off + 28)
    out = []
    for o in offsets:
        p = off + strings_start + o
        if utf8:
            n = data[p]; p += 1
            if n & 0x80: p += 1
            n = data[p]; p += 1
            if n & 0x80: n = ((n & 0x7f) << 8) | data[p]; p += 1
            out.append(data[p:p + n].decode('utf-8', 'replace'))
        else:
            n = struct.unpack_from('<H', data, p)[0]; p += 2
            if n & 0x8000: n = ((n & 0x7fff) << 16) | struct.unpack_from('<H', data, p)[0]; p += 2
            out.append(data[p:p + 2 * n].decode('utf-16le', 'replace'))
    return out, off + size

def value(strings, dtype, d):
    if dtype == 0x03: return strings[d] if d < len(strings) else '?'
    if dtype == 0x12: return 'true' if d else 'false'
    if dtype == 0x01: return '@0x%08x' % d
    return str(d)

def parse(data):
    off = 8
    strings = []
    stack = []
    while off < len(data):
        t, hs, size = struct.unpack_from('<HHI', data, off)
        if t == 0x0001:
            strings, _ = read_strings(data, off)
        elif t == 0x0102:
            ns, name, attr_start, attr_size, attr_count = struct.unpack_from('<IIHHH', data, off + 16)
            tag = strings[name]
            attrs = {}
            p = off + 16 + attr_start
            for _ in range(attr_count):
                ans, aname, raw, asize, res0, dtype, d = struct.unpack_from('<IIIHBBI', data, p)
                attrs[strings[aname]] = value(strings, dtype, d)
                p += attr_size
            yield tag, attrs, list(stack)
            stack.append(tag)
        elif t == 0x0103:
            if stack: stack.pop()
        off += size

apk = sys.argv[1]
data = zipfile.ZipFile(apk).read('AndroidManifest.xml')
component = None
for tag, attrs, path in parse(data):
    if tag == 'manifest':
        print('package', attrs.get('package'), 'versionName', attrs.get('versionName'))
    elif tag == 'uses-permission':
        print('uses-permission', attrs.get('name'))
    elif tag == 'permission':
        print('permission (declared)', attrs.get('name'))
    elif tag == 'application':
        print('application allowBackup=%s debuggable=%s usesCleartextTraffic=%s' % (attrs.get('allowBackup'), attrs.get('debuggable'), attrs.get('usesCleartextTraffic')))
    elif tag in ('activity', 'activity-alias', 'service', 'receiver', 'provider'):
        component = attrs.get('name')
        if attrs.get('exported') == 'true':
            print('exported', tag, component)
    elif tag == 'data' and 'scheme' in attrs:
        print('scheme', attrs['scheme'], 'in', component)
