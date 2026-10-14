import os, sys, io, re, zipfile
sys.stdout.reconfigure(encoding="utf-8")
from decode_axml import decode_axml
from parse_arsc import ARSCParser
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, transparent
import pypdfium2

apk_path = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
z = zipfile.ZipFile(apk_path)
arsc = ARSCParser(z.read("resources.arsc"))

def parse_svg_path(path_str):
    tokens = re.findall(r'([a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?)', path_str)
    commands = []
    i = 0
    while i < len(tokens):
        token = tokens[i]
        if token.isalpha():
            cmd = token
            i += 1
            args = []
            while i < len(tokens) and not tokens[i].isalpha():
                args.append(float(tokens[i]))
                i += 1
            commands.append((cmd, args))
        else:
            i += 1
    return commands

def render_vector_xml(xml_content, target_path, override_color=None, target_size=96):
    vw_m = re.search(r'viewportWidth="([^"]+)"', xml_content)
    vh_m = re.search(r'viewportHeight="([^"]+)"', xml_content)
    def parse_dim(val):
        try:
            v = float(val)
            if v > 1000000:
                import struct
                packed = struct.pack('>I', int(v))
                return struct.unpack('>f', packed)[0]
            return v
        except:
            return 24.0
    vw = parse_dim(vw_m.group(1)) if vw_m else 24.0
    vh = parse_dim(vh_m.group(1)) if vh_m else 24.0
    
    pdf_io = io.BytesIO()
    c = canvas.Canvas(pdf_io, pagesize=(target_size, target_size))
    scale = target_size / max(vw, vh)
    
    path_blocks = re.findall(r'<path\b([^>]*?)(?:/>|>(.*?)</path>)', xml_content, re.DOTALL)
    for attrs, _ in path_blocks:
        path_data_m = re.search(r'pathData="([^"]+)"', attrs)
        if not path_data_m:
            continue
        path_data = path_data_m.group(1)
        fill_m = re.search(r'fillColor="([^"]+)"', attrs)
        stroke_m = re.search(r'strokeColor="([^"]+)"', attrs)
        stroke_w_m = re.search(r'strokeWidth="([^"]+)"', attrs)
        
        fill_color = None
        if override_color:
            fill_color = HexColor(override_color)
        elif fill_m:
            f_val = fill_m.group(1)
            if f_val.startswith("#"):
                fill_color = HexColor(f_val[:7])
            elif f_val.isdigit():
                col_info = arsc.color_map.get(int(f_val))
                if col_info and col_info.startswith("#"):
                    fill_color = HexColor(col_info[-6:])
                else:
                    fill_color = HexColor("#757575")
            else:
                fill_color = HexColor("#757575")
        else:
            fill_color = HexColor("#757575")

        stroke_color = None
        if stroke_m:
            s_val = stroke_m.group(1)
            if s_val.startswith("#"):
                stroke_color = HexColor(s_val[:7])
            elif s_val.isdigit():
                col_info = arsc.color_map.get(int(s_val))
                if col_info and col_info.startswith("#"):
                    stroke_color = HexColor(col_info[-6:])

        stroke_width = parse_dim(stroke_w_m.group(1)) if stroke_w_m else 1.0

        p = c.beginPath()
        cmds = parse_svg_path(path_data)
        cur_x, cur_y = 0.0, 0.0
        start_x, start_y = 0.0, 0.0
        last_cx, last_cy = 0.0, 0.0
        has_path = False

        def tx(x): return x * scale
        def ty(y): return (vh - y) * scale

        for cmd, args in cmds:
            has_path = True
            if cmd == 'M':
                cur_x, cur_y = args[0], args[1]
                start_x, start_y = cur_x, cur_y
                p.moveTo(tx(cur_x), ty(cur_y))
            elif cmd == 'm':
                cur_x += args[0]; cur_y += args[1]
                start_x, start_y = cur_x, cur_y
                p.moveTo(tx(cur_x), ty(cur_y))
            elif cmd == 'L':
                for j in range(0, len(args), 2):
                    cur_x, cur_y = args[j], args[j+1]
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'l':
                for j in range(0, len(args), 2):
                    cur_x += args[j]; cur_y += args[j+1]
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'H':
                cur_x = args[0]; p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'h':
                cur_x += args[0]; p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'V':
                cur_y = args[0]; p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'v':
                cur_y += args[0]; p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'C':
                for j in range(0, len(args), 6):
                    x1, y1, x2, y2, cur_x, cur_y = args[j:j+6]
                    last_cx, last_cy = x2, y2
                    p.curveTo(tx(x1), ty(y1), tx(x2), ty(y2), tx(cur_x), ty(cur_y))
            elif cmd == 'c':
                for j in range(0, len(args), 6):
                    x1 = cur_x + args[j]; y1 = cur_y + args[j+1]
                    x2 = cur_x + args[j+2]; y2 = cur_y + args[j+3]
                    cur_x += args[j+4]; cur_y += args[j+5]
                    last_cx, last_cy = x2, y2
                    p.curveTo(tx(x1), ty(y1), tx(x2), ty(y2), tx(cur_x), ty(cur_y))
            elif cmd in ['Z', 'z']:
                p.close()
                cur_x, cur_y = start_x, start_y

        if has_path:
            do_fill = fill_color is not None
            do_stroke = stroke_color is not None
            if do_fill: c.setFillColor(fill_color)
            if do_stroke:
                c.setStrokeColor(stroke_color)
                c.setLineWidth(stroke_width * scale)
            c.drawPath(p, fill=1 if do_fill else 0, stroke=1 if do_stroke else 0)

    c.save()
    pdf_bytes = pdf_io.getvalue()
    pdf = pypdfium2.PdfDocument(pdf_bytes)
    page = pdf[0]
    bitmap = page.render(scale=2)
    img = bitmap.to_pil()
    img.save(target_path)
    print(f"Rendered: {target_path} (size {img.size})")

more_icons = [
    ("res/drawable/ic_close_black.xml", "assets/icons/ic_close.png", "#4D4D4D"),
    ("res/drawable/ic_check.xml", "assets/icons/ic_check.png", "#0F8A0F"),
    ("res/drawable/ic_arrow_down.xml", "assets/icons/ic_arrow_down.png", "#1A1A1A"),
    ("res/drawable/ic_download.xml", "assets/icons/ic_download.png", "#4D4D4D"),
    ("res/drawable/solar_crown.xml", "assets/icons/ic_crown.png", "#F59E0B"),
    ("res/drawable/ic_add_user.xml", "assets/icons/ic_add_user.png", "#FFFFFF"),
    ("res/drawable/ic_cloud_outline.xml", "assets/icons/ic_cloud.png", "#B81414"),
    ("res/drawable/ic_empty_customer_list_state.xml", "assets/icons/ic_empty_customer.png", "#9CA3AF"),
]

for xml_name, out_path, col in more_icons:
    # Try finding in APK
    found = None
    if xml_name in z.namelist():
        found = xml_name
    else:
        base = xml_name.split('/')[-1].replace('.xml', '')
        for n in z.namelist():
            if n.startswith("res/drawable") and n.endswith(".xml") and base in n:
                found = n
                break
    if found:
        print(f"Rendering {found} -> {out_path}")
        raw = decode_axml(z.read(found))
        render_vector_xml(raw, out_path, override_color=col)
    else:
        print(f"Not found in APK: {xml_name}")
