import sys, io, re
import pypdfium2
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

sys.stdout.reconfigure(encoding="utf-8")

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

target_size = 240
scale = target_size / 24.0

pdf_io = io.BytesIO()
c = canvas.Canvas(pdf_io, pagesize=(target_size, target_size))

def tx(x): return x * scale
def ty(y): return target_size - (y * scale)

path1_data = "M2,12.273L6.22,6.274C6.782,5.475 7.697,5 8.674,5H15.706C16.73,5 17.682,5.522 18.234,6.384L22,12.273V17C22,18.657 20.657,20 19,20H5C3.343,20 2,18.657 2,17V12.273Z"
path2_data = "M2,12.273L6.22,6.274C6.782,5.475 7.697,5 8.674,5H15.706C16.73,5 17.682,5.522 18.234,6.384L22,12.273M2,12.273V17C2,18.657 3.343,20 5,20H19C20.657,20 22,18.657 22,17C22,15.512 22,14.148 22,12.273M2,12.273H7.424C8.338,12.273 9.101,12.911 9.513,13.727C9.998,14.689 10.783,15.588 12,15.588C12.379,15.588 13.652,15.56 14.514,13.782C14.921,12.942 15.685,12.285 16.618,12.304C18.241,12.339 20.629,12.376 22,12.273"

# Draw Path 1: Fill #FFEDD5 + Stroke #EA580C
p1 = c.beginPath()
for cmd, args in parse_svg_path(path1_data):
    if cmd == 'M':
        p1.moveTo(tx(args[0]), ty(args[1]))
        cur_x, cur_y = args[0], args[1]
    elif cmd == 'L':
        p1.lineTo(tx(args[0]), ty(args[1]))
        cur_x, cur_y = args[0], args[1]
    elif cmd == 'H':
        p1.lineTo(tx(args[0]), ty(cur_y))
        cur_x = args[0]
    elif cmd == 'V':
        p1.lineTo(tx(cur_x), ty(args[0]))
        cur_y = args[0]
    elif cmd == 'C':
        for j in range(0, len(args), 6):
            p1.curveTo(tx(args[j]), ty(args[j+1]), tx(args[j+2]), ty(args[j+3]), tx(args[j+4]), ty(args[j+5]))
            cur_x, cur_y = args[j+4], args[j+5]
    elif cmd in ['Z', 'z']:
        p1.close()

c.setFillColor(HexColor('#FFEDD5'))
c.setStrokeColor(HexColor('#EA580C'))
c.setLineWidth(1.4 * scale)
c.drawPath(p1, fill=1, stroke=1)

# Draw Path 2: Stroke #EA580C
p2 = c.beginPath()
for cmd, args in parse_svg_path(path2_data):
    if cmd == 'M':
        p2.moveTo(tx(args[0]), ty(args[1]))
        cur_x, cur_y = args[0], args[1]
    elif cmd == 'L':
        p2.lineTo(tx(args[0]), ty(args[1]))
        cur_x, cur_y = args[0], args[1]
    elif cmd == 'H':
        p2.lineTo(tx(args[0]), ty(cur_y))
        cur_x = args[0]
    elif cmd == 'V':
        p2.lineTo(tx(cur_x), ty(args[0]))
        cur_y = args[0]
    elif cmd == 'C':
        for j in range(0, len(args), 6):
            p2.curveTo(tx(args[j]), ty(args[j+1]), tx(args[j+2]), ty(args[j+3]), tx(args[j+4]), ty(args[j+5]))
            cur_x, cur_y = args[j+4], args[j+5]

c.setStrokeColor(HexColor('#EA580C'))
c.setLineWidth(1.4 * scale)
c.drawPath(p2, fill=0, stroke=1)

c.save()
pdf_bytes = pdf_io.getvalue()
pdf = pypdfium2.PdfDocument(pdf_bytes)
bitmap = pdf[0].render(scale=2, fill_color=(0, 0, 0, 0))
img = bitmap.to_pil()
img.save('assets/icons/grid_cashbox.png')
print('Rendered authentic grid_cashbox.png!')
