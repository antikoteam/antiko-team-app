from PIL import Image
import os

input_path = r'c:\Users\kk\Desktop\antiko team app\www\assets\img\antiko-chain.png'
output_path = r'c:\Users\kk\Desktop\antiko team app\www\assets\img\antiko-chain-fixed.png'

if not os.path.exists(input_path):
    print(f"File not found: {input_path}")
    exit(1)

img = Image.open(input_path).convert("RGBA")
datas = img.getdata()

newData = []
# Detecting checkerboard: usually light grey and white pixels.
# White: (255, 255, 255)
# Grey: (192, 192, 192) or similar patterns.
# We'll treat very light/white-ish pixels as transparent if they are near the edges or part of the pattern.
# Actually, a better way is to target the specific checkerboard colors.

for item in datas:
    # If the pixel is very close to white or very light grey (common checkerboard colors)
    # Threshold for white: (200+, 200+, 200+)
    if item[0] > 200 and item[1] > 200 and item[2] > 200:
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)

img.putdata(newData)
img.save(output_path, "PNG")
print(f"Saved to {output_path}")
