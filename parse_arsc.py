import struct, sys, zipfile

class ARSCParser:
    def __init__(self, data):
        self.data = data
        self.strings = []
        self.key_strings = []
        self.type_strings = []
        self.res_map = {} # res_id -> (type_name, entry_name, value)
        self.string_map = {} # name -> string_value
        self.color_map = {}  # name -> color_value
        self.parse()

    def parse_string_pool(self, chunk_data):
        str_count, style_count, flags, str_start, styles_start = struct.unpack('<IIIII', chunk_data[8:28])
        is_utf8 = (flags & (1 << 8)) != 0
        offsets = [struct.unpack('<I', chunk_data[28+i*4:32+i*4])[0] for i in range(str_count)]
        str_pool_bytes = chunk_data[str_start:]
        res = []
        for off in offsets:
            if off >= len(str_pool_bytes):
                res.append("")
                continue
            if is_utf8:
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
                res.append(s)
            else:
                p = off
                u16_len = struct.unpack('<H', str_pool_bytes[p:p+2])[0]
                p += 2
                if u16_len & 0x8000:
                    u16_len = ((u16_len & 0x7fff) << 16) | struct.unpack('<H', str_pool_bytes[p:p+2])[0]
                    p += 2
                s = str_pool_bytes[p:p+u16_len*2].decode('utf-16le', errors='ignore')
                res.append(s)
        return res

    def parse(self):
        data = self.data
        if len(data) < 12:
            return
        chunk_type, header_size, chunk_size = struct.unpack('<HHI', data[:8])
        if chunk_type != 0x0002: # RES_TABLE_TYPE
            return
        pkg_count = struct.unpack('<I', data[8:12])[0]
        pos = header_size
        
        # global string pool
        c_type, c_hsize, c_size = struct.unpack('<HHI', data[pos:pos+8])
        if c_type == 0x0001:
            self.strings = self.parse_string_pool(data[pos:pos+c_size])
            pos += c_size
            
        # parse packages
        while pos < len(data):
            if pos + 8 > len(data):
                break
            c_type, c_hsize, c_size = struct.unpack('<HHI', data[pos:pos+8])
            if c_type != 0x0200: # RES_TABLE_PACKAGE_TYPE
                pos += c_size
                continue
                
            pkg_data = data[pos:pos+c_size]
            pkg_id = struct.unpack('<I', pkg_data[8:12])[0]
            pkg_name = pkg_data[12:12+256].decode('utf-16le', errors='ignore').split('\x00')[0]
            type_str_off, last_type_sym, key_str_off, last_key_sym = struct.unpack('<IIII', pkg_data[268:284])
            
            # parse type string pool
            t_type, t_hsize, t_size = struct.unpack('<HHI', pkg_data[type_str_off:type_str_off+8])
            type_strings = self.parse_string_pool(pkg_data[type_str_off:type_str_off+t_size])
            
            # parse key string pool
            k_type, k_hsize, k_size = struct.unpack('<HHI', pkg_data[key_str_off:key_str_off+8])
            key_strings = self.parse_string_pool(pkg_data[key_str_off:key_str_off+k_size])
            
            # Now iterate remaining chunks in package
            sub_pos = key_str_off + k_size
            while sub_pos < len(pkg_data):
                if sub_pos + 8 > len(pkg_data):
                    break
                s_type, s_hsize, s_size = struct.unpack('<HHI', pkg_data[sub_pos:sub_pos+8])
                if s_type == 0x0201: # RES_TABLE_TYPE_TYPE
                    type_id = pkg_data[sub_pos+8]
                    entry_count = struct.unpack('<I', pkg_data[sub_pos+12:sub_pos+16])[0]
                    entries_start = struct.unpack('<I', pkg_data[sub_pos+16:sub_pos+20])[0]
                    type_name = type_strings[type_id - 1] if 0 < type_id <= len(type_strings) else f"type_{type_id}"
                    
                    offsets = [struct.unpack('<i', pkg_data[sub_pos+s_hsize+i*4:sub_pos+s_hsize+4+i*4])[0] for i in range(entry_count)]
                    
                    for entry_idx, off in enumerate(offsets):
                        if off < 0:
                            continue
                        e_pos = sub_pos + entries_start + off
                        if e_pos + 8 > len(pkg_data):
                            continue
                        e_size, e_flags, e_key = struct.unpack('<HHI', pkg_data[e_pos:e_pos+8])
                        key_name = key_strings[e_key] if e_key < len(key_strings) else f"key_{e_key}"
                        res_id = (pkg_id << 24) | (type_id << 16) | entry_idx
                        
                        # read value
                        if not (e_flags & 0x0001): # not a complex map
                            val_size, val_res0, val_type, val_data = struct.unpack('<HBBI', pkg_data[e_pos+8:e_pos+16])
                            if val_type == 0x03: # TYPE_STRING
                                str_val = self.strings[val_data] if val_data < len(self.strings) else ""
                                self.string_map[key_name] = str_val
                                self.res_map[res_id] = (type_name, key_name, str_val)
                            elif val_type in [0x1c, 0x1d]: # TYPE_INT_COLOR_ARGB8 / RGB8
                                color_val = f"#{val_data:08X}"
                                self.color_map[key_name] = color_val
                                self.res_map[res_id] = (type_name, key_name, color_val)
                            elif val_type == 0x12: # TYPE_INT_BOOLEAN
                                self.res_map[res_id] = (type_name, key_name, bool(val_data))
                            else:
                                self.res_map[res_id] = (type_name, key_name, val_data)
                                
                sub_pos += s_size
            pos += c_size

sys.stdout.reconfigure(encoding='utf-8')
apk_path = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
with zipfile.ZipFile(apk_path) as z:
    parser = ARSCParser(z.read("resources.arsc"))
    print(f"Total string entries: {len(parser.string_map)}")
    print(f"Total color entries: {len(parser.color_map)}")
    
    print("\n--- SAMPLE APP COLORS ---")
    for k in sorted(parser.color_map.keys()):
        if any(c in k.lower() for c in ['primary', 'accent', 'brand', 'tally', 'red', 'green', 'bg', 'surface', 'toolbar']):
            print(f"  {k}: {parser.color_map[k]}")
            
    print("\n--- SAMPLE APP STRINGS (BANGLA) ---")
    count = 0
    for k, v in parser.string_map.items():
        if any('\u0980' <= ch <= '\u09ff' for ch in v):
            print(f"  {k} = {v}")
            count += 1
            if count >= 30:
                break
