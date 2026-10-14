import struct, sys

def decode_axml(data):
    if len(data) < 8:
        return "File too short"
    magic, file_size = struct.unpack('<II', data[:8])
    if magic != 0x00080003:
        return f"Not an AXML file (magic: {hex(magic)})"
    
    pos = 8
    strings = []
    xml_lines = []
    indent = 0
    
    while pos < len(data):
        if pos + 8 > len(data):
            break
        chunk_type, chunk_size = struct.unpack('<II', data[pos:pos+8])
        if chunk_size < 8 or pos + chunk_size > len(data):
            break
        
        chunk_data = data[pos:pos+chunk_size]
        
        if chunk_type == 0x001C0001: # STRING POOL
            str_count, style_count, flags, str_start, styles_start = struct.unpack('<IIIII', chunk_data[8:28])
            is_utf8 = (flags & (1 << 8)) != 0
            offsets = [struct.unpack('<I', chunk_data[28+i*4:32+i*4])[0] for i in range(str_count)]
            str_pool_bytes = chunk_data[str_start:]
            for off in offsets:
                if off >= len(str_pool_bytes):
                    strings.append("")
                    continue
                if is_utf8:
                    # utf-8 length prefix: 1 or 2 bytes len, 1 or 2 bytes byte count
                    p = off
                    u16_len = str_pool_bytes[p]
                    p += 1
                    if u16_len & 0x80:
                        u16_len = ((u16_len & 0x7f) << 8) | str_pool_bytes[p]
                        p += 1
                    u8_len = str_pool_bytes[p]
                    p += 1
                    if u8_len & 0x80:
                        u8_len = ((u8_len & 0x7f) << 8) | str_pool_bytes[p]
                        p += 1
                    s = str_pool_bytes[p:p+u8_len].decode('utf-8', errors='ignore')
                    strings.append(s)
                else:
                    # utf-16
                    p = off
                    u16_len = struct.unpack('<H', str_pool_bytes[p:p+2])[0]
                    p += 2
                    if u16_len & 0x8000:
                        u16_len = ((u16_len & 0x7fff) << 16) | struct.unpack('<H', str_pool_bytes[p:p+2])[0]
                        p += 2
                    s = str_pool_bytes[p:p+u16_len*2].decode('utf-16le', errors='ignore')
                    strings.append(s)
        
        elif chunk_type == 0x00100102: # START_TAG
            # line_number, comment, ns_idx, name_idx, flags, attr_count, id_attr, class_attr, style_attr
            name_idx = struct.unpack('<I', chunk_data[20:24])[0]
            attr_count = struct.unpack('<H', chunk_data[28:30])[0]
            elem_name = strings[name_idx] if name_idx < len(strings) else f"elem_{name_idx}"
            attrs = []
            attr_pos = 36
            for _ in range(attr_count):
                if attr_pos + 20 > len(chunk_data):
                    break
                ans_idx, aname_idx, aval_idx, atype, adata = struct.unpack('<IIIIB', chunk_data[attr_pos:attr_pos+17])
                # wait, let's unpack standard 20-byte attribute:
                # ns, name, raw_value, type (1 byte), data (4 bytes)
                ans, aname, araw, atype_val, adata_val = struct.unpack('<IIIIi', chunk_data[attr_pos:attr_pos+20])
                aname_str = strings[aname] if aname < len(strings) else f"attr_{aname}"
                if araw != 0xFFFFFFFF and araw < len(strings):
                    aval_str = strings[araw]
                else:
                    aval_str = str(adata_val)
                attrs.append(f'{aname_str}="{aval_str}"')
                attr_pos += 20
            xml_lines.append("  " * indent + f"<{elem_name} {' '.join(attrs)}>")
            indent += 1
        
        elif chunk_type == 0x00100103: # END_TAG
            name_idx = struct.unpack('<I', chunk_data[20:24])[0]
            elem_name = strings[name_idx] if name_idx < len(strings) else f"elem_{name_idx}"
            indent = max(0, indent - 1)
            xml_lines.append("  " * indent + f"</{elem_name}>")
            
        pos += chunk_size
        
    return "\n".join(xml_lines)

if __name__ == '__main__':
    import zipfile
    sys.stdout.reconfigure(encoding='utf-8')
    apk_path = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
    with zipfile.ZipFile(apk_path) as z:
        for target in ["res/layout/activity_main.xml", "res/layout/fragment_home.xml", "res/layout/item_customer_supplier_account.xml"]:
            print(f"=== DECODING {target} ===")
            print(decode_axml(z.read(target))[:1200])
