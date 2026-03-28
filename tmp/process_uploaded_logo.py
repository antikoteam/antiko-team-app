from PIL import Image, ImageOps
import os

input_path = r'C:\Users\kk\.gemini\antigravity\brain\aa3d3234-456f-4a14-a3bf-7db514a6893c\media__1774563686016.jpg'
output_path = r'c:\Users\kk\Desktop\antiko team app\www\assets\img\antiko-chain.png'

if not os.path.exists(input_path):
    print(f"File not found: {input_path}")
    exit(1)

# Open image
img = Image.open(input_path).convert("RGBA")

# Use the Luminance of the pixel as a mask to remove white
# Since it's a white background, high luminance = more transparent
gray = img.convert("L")
# Invert: white (255) becomes 0 (transparent), black (0) becomes 255 (opaque)
alpha = ImageOps.invert(gray)

# We want white to be fully transparent, but keep the colors
# Actually, the logo has dark areas.
# Let's use a threshold for the background.
newData = []
datas = img.getdata()
for item in datas:
    # If the pixel is very white (e.g., > 240 on all RGB)
    if item[0] > 245 and item[1] > 245 and item[2] > 245:
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)

img.putdata(newData)

# Crop if needed to remove excess white border
# actually, the logo is already centered.

img.save(output_path, "PNG")
print(f"Saved to {output_path}")
