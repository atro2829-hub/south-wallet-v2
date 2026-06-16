#!/usr/bin/env python3
"""
Generate splash screen images for South Wallet Android apps.
Creates splash images with SOLID RED background (#E60000) and centered logo
for all Android density buckets.
"""

import base64
import os
import re
import sys
from PIL import Image
from io import BytesIO

# --- Configuration ---
LOGO_TS_PATH = "/home/z/my-project/src/lib/logo.ts"

# Background color: SOLID RED
BG_COLOR = (0xE6, 0x00, 0x00)  # #E60000

# Logo size relative to image width (30-35%)
LOGO_WIDTH_RATIO = 0.32

# Density bucket definitions: (dirname, width, height)
USER_APP_BUCKETS = [
    ("drawable", 540, 960),
    ("drawable-land-hdpi", 640, 360),
    ("drawable-land-mdpi", 480, 320),
    ("drawable-land-xhdpi", 960, 540),
    ("drawable-land-xxhdpi", 1280, 720),
    ("drawable-land-xxxhdpi", 1920, 1080),
    ("drawable-port-hdpi", 360, 640),
    ("drawable-port-mdpi", 320, 480),
    ("drawable-port-xhdpi", 540, 960),
    ("drawable-port-xxhdpi", 720, 1280),
    ("drawable-port-xxxhdpi", 1080, 1920),
]

ADMIN_APP_BUCKETS = USER_APP_BUCKETS.copy()  # Same dimensions

USER_APP_BASE = "/home/z/my-project/android/app/src/main/res"
ADMIN_APP_BASE = "/home/z/my-project/south-admin/android/app/src/main/res"


def extract_logo_from_file(filepath: str) -> Image.Image:
    """Extract and return the logo PIL Image from the logo.ts file."""
    with open(filepath, 'r') as f:
        content = f.read()

    # Extract the LOGO_BASE64 value
    match = re.search(r'LOGO_BASE64\s*=\s*"(data:image/png;base64,[^"]+)"', content)
    if not match:
        raise ValueError(f"Could not find LOGO_BASE64 in {filepath}")

    data_uri = match.group(1)

    # Strip the "data:image/png;base64," prefix
    base64_part = data_uri.split(",", 1)[1]
    img_data = base64.b64decode(base64_part)
    logo = Image.open(BytesIO(img_data)).convert("RGBA")
    return logo


def create_splash_image(logo: Image.Image, width: int, height: int) -> Image.Image:
    """Create a splash screen image with solid red background and centered logo."""
    # Create solid red background
    splash = Image.new("RGBA", (width, height), BG_COLOR + (255,))

    # Calculate logo size (30-35% of width)
    logo_width = int(width * LOGO_WIDTH_RATIO)
    logo_height = int(logo.size[1] * (logo_width / logo.size[0]))

    # Resize logo with high-quality resampling
    resized_logo = logo.resize((logo_width, logo_height), Image.LANCZOS)

    # Center the logo on the splash image
    logo_x = (width - logo_width) // 2
    logo_y = (height - logo_height) // 2

    splash.paste(resized_logo, (logo_x, logo_y), resized_logo)

    return splash


def generate_splash_images(logo: Image.Image, base_path: str, buckets: list):
    """Generate splash images for all density buckets."""
    for dirname, width, height in buckets:
        dir_path = os.path.join(base_path, dirname)
        os.makedirs(dir_path, exist_ok=True)

        splash = create_splash_image(logo, width, height)
        output_path = os.path.join(dir_path, "splash.png")
        splash.save(output_path, "PNG")

        # Verify
        with Image.open(output_path) as img:
            actual_w, actual_h = img.size
            status = "OK" if (actual_w == width and actual_h == height) else "FAIL"
            print(f"  [{status}] {dirname}/splash.png: {actual_w}x{actual_h} (expected {width}x{height})")


def main():
    print("Extracting logo from logo.ts...")
    logo = extract_logo_from_file(LOGO_TS_PATH)
    print(f"Logo size: {logo.size[0]}x{logo.size[1]}")

    print("\nGenerating splash images for USER app...")
    generate_splash_images(logo, USER_APP_BASE, USER_APP_BUCKETS)

    print("\nGenerating splash images for ADMIN app...")
    generate_splash_images(logo, ADMIN_APP_BASE, ADMIN_APP_BUCKETS)

    print("\nAll splash images generated successfully!")


if __name__ == "__main__":
    main()
