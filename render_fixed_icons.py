import sys, os, zipfile, io, re
import pypdfium2
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from decode_axml import decode_axml

sys.stdout.reconfigure(encoding="utf-8")

apk_path = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
z = zipfile.ZipFile(apk_path)

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

def render_vector(xml_str, target_path, override_color=None, target_size=120):
    vp_w_m = re.search(r'viewportWidth="([^"]+)"', xml_str)
    vp_h_m = re.search(r'viewportHeight="([^"]+)"', xml_str)
    
    vp_w = float(vp_w_m.group(1)) if vp_w_m else 24.0
    vp_h = float(vp_h_m.group(1)) if vp_h_m else 24.0
    
    if vp_w > 100000:
        import struct
        vp_w = struct.unpack('!f', struct.pack('!I', int(vp_w)))[0]
        vp_h = struct.unpack('!f', struct.pack('!I', int(vp_h)))[0]
    
    scale = target_size / max(vp_w, vp_h)
    
    pdf_io = io.BytesIO()
    c = canvas.Canvas(pdf_io, pagesize=(target_size, target_size))
    
    def tx(x): return x * scale
    def ty(y): return target_size - (y * scale)
    
    paths = re.findall(r'<path\b([^>]*)/?>', xml_str)
    for p_attr in paths:
        d_m = re.search(r'pathData="([^"]+)"', p_attr)
        if not d_m: continue
        path_data = d_m.group(1)
        
        sw_m = re.search(r'strokeWidth="([^"]+)"', p_attr)
        sw_val = 1.5
        if sw_m:
            try:
                raw_sw = float(sw_m.group(1))
                if raw_sw > 100000:
                    import struct
                    raw_sw = struct.unpack('!f', struct.pack('!I', int(raw_sw)))[0]
                sw_val = raw_sw
            except:
                pass
        
        fill_color = None
        stroke_color = None
        
        if override_color:
            if 'strokeColor' in p_attr:
                stroke_color = HexColor(override_color)
            else:
                fill_color = HexColor(override_color)
        else:
            fill_color = HexColor('#EA580C')
            
        cmds = parse_svg_path(path_data)
        p = c.beginPath()
        cur_x, cur_y = 0.0, 0.0
        start_x, start_y = 0.0, 0.0
        has_points = False
        
        for cmd, args in cmds:
            if cmd == 'M':
                cur_x, cur_y = args[0], args[1]
                start_x, start_y = cur_x, cur_y
                p.moveTo(tx(cur_x), ty(cur_y))
                has_points = True
                for j in range(2, len(args), 2):
                    cur_x, cur_y = args[j], args[j+1]
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'm':
                cur_x += args[0]
                cur_y += args[1]
                start_x, start_y = cur_x, cur_y
                p.moveTo(tx(cur_x), ty(cur_y))
                has_points = True
                for j in range(2, len(args), 2):
                    cur_x += args[j]
                    cur_y += args[j+1]
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'L':
                for j in range(0, len(args), 2):
                    cur_x, cur_y = args[j], args[j+1]
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'l':
                for j in range(0, len(args), 2):
                    cur_x += args[j]
                    cur_y += args[j+1]
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'H':
                cur_x = args[0]
                p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'h':
                cur_x += args[0]
                p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'V':
                cur_y = args[0]
                p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'v':
                cur_y += args[0]
                p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'C':
                for j in range(0, len(args), 6):
                    x1, y1 = args[j], args[j+1]
                    x2, y2 = args[j+2], args[j+3]
                    cur_x, cur_y = args[j+4], args[j+5]
                    p.curveTo(tx(x1), ty(y1), tx(x2), ty(y2), tx(cur_x), ty(cur_y))
            elif cmd == 'c':
                for j in range(0, len(args), 6):
                    x1, y1 = cur_x + args[j], cur_y + args[j+1]
                    x2, y2 = cur_x + args[j+2], cur_y + args[j+3]
                    cur_x, cur_y = cur_x + args[j+4], cur_y + args[j+5]
                    p.curveTo(tx(x1), ty(y1), tx(x2), ty(y2), tx(cur_x), ty(cur_y))
            elif cmd in ['Z', 'z']:
                p.close()
                cur_x, cur_y = start_x, start_y
                
        if has_points:
            do_fill = fill_color is not None
            do_stroke = stroke_color is not None
            if do_fill: c.setFillColor(fill_color)
            if do_stroke:
                c.setStrokeColor(stroke_color)
                c.setLineWidth(sw_val * scale)
            c.drawPath(p, fill=1 if do_fill else 0, stroke=1 if do_stroke else 0)
            
    c.save()
    pdf_bytes = pdf_io.getvalue()
    pdf = pypdfium2.PdfDocument(pdf_bytes)
    page = pdf[0]
    bitmap = page.render(scale=2, fill_color=(0, 0, 0, 0))
    img = bitmap.to_pil()
    img.save(target_path)
    print(f"Rendered {target_path} (mode {img.mode}, size {img.size})")

render_vector(decode_axml(z.read("res/drawable/backup.xml")), "assets/icons/grid_backup.png", override_color="#16A34A")
render_vector(decode_axml(z.read("res/drawable/ic_cash_box_new.xml")), "assets/icons/grid_cashbox.png", override_color="#EA580C")
render_vector(decode_axml(z.read("res/drawable/ic_support.xml")), "assets/icons/tb_support_white.png", override_color="#FFFFFF")
render_vector(decode_axml(z.read("res/drawable/ic_message_close.xml")), "assets/icons/tb_inbox_white.png", override_color="#FFFFFF")

print("Finished rendering fixed icons!")


# Phase 2 Authentic Icons Rendering
phase2_icons = [
    ('res/drawable/ic_menu_accounts.xml', 'assets/icons/ic_menu_accounts.png', '#1976D2'),
    ('res/drawable/ic_menu_payment_messaging.xml', 'assets/icons/ic_menu_payment_messaging.png', '#0F8A0F'),
    ('res/drawable/ic_menu_buy_sell.xml', 'assets/icons/ic_menu_profit.png', '#0F8A0F'),
    ('res/drawable/ic_menu_cost.xml', 'assets/icons/ic_menu_cost.png', '#D32F2F'),
    ('res/drawable/ic_menu_baki_hisab.xml', 'assets/icons/ic_menu_baki_hisab.png', '#D32F2F'),
    ('res/drawable/ic_details_report.xml', 'assets/icons/ic_menu_report.png', '#7C3AED'),
    ('res/drawable/ic_menu_malik_report.xml', 'assets/icons/ic_menu_malik_report.png', '#0F8A0F'),
    ('res/drawable/ic_stock_new.xml', 'assets/icons/ic_menu_stock.png', '#2563EB'),
    ('res/drawable/ic_menu_settings.xml', 'assets/icons/ic_menu_settings.png', '#4B5563'),
    ('res/drawable/ic_security_lock.xml', 'assets/icons/ic_menu_lock.png', '#B81414'),
    ('res/drawable/ic_circle_data_backup.xml', 'assets/icons/ic_menu_backup.png', '#1976D2'),
    ('res/drawable/ic_call_help.xml', 'assets/icons/ic_menu_support.png', '#B81414'),
    ('res/drawable/ic_sale_v2.xml', 'assets/icons/ic_cash_sale.png', '#0F8A0F'),
    ('res/drawable/ic_menu_buy_sell.xml', 'assets/icons/ic_cash_buy.png', '#D32F2F'),
    ('res/drawable/ic_expense.xml', 'assets/icons/ic_cash_cost.png', '#D32F2F'),
    ('res/drawable/ic_menu_malik_report.xml', 'assets/icons/ic_malik_in.png', '#0F8A0F'),
    ('res/drawable/ic_menu_malik_report.xml', 'assets/icons/ic_malik_out.png', '#D32F2F'),
    ('res/drawable/ic_cash_milai.xml', 'assets/icons/ic_cash_milai.png', '#B81414'),
    ('res/drawable/ic_call.xml', 'assets/icons/ic_call.png', '#0F8A0F'),
    ('res/drawable/ic_sms.xml', 'assets/icons/ic_sms.png', '#1976D2'),
    ('res/drawable/ic_delete.xml', 'assets/icons/ic_delete.png', '#D32F2F'),
    ('res/drawable/ic_edit.xml', 'assets/icons/ic_edit.png', '#1976D2'),
]

for res_xml, out_png, col in phase2_icons:
    if res_xml in z.namelist():
        raw = decode_axml(z.read(res_xml))
        render_vector(raw, out_png, override_color=col, target_size=120)
    else:
        print(f'Warning: {res_xml} not found in APK')

print('All Phase 2 authentic icons rendered successfully!')
