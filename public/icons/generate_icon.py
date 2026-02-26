from PIL import Image, ImageDraw

def generate_icon(size):
    # Create a new image with transparent background
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    
    # Scale factor
    s = size / 24.0
    
    # Draw rounded rect (background)
    # rect width=24 height=24 rx=6 fill="#00d4ff"
    # hex #00d4ff is (0, 212, 255)
    margin = 0
    draw.rounded_rectangle(
        [0, 0, size, size],
        radius=6 * s,
        fill=(0, 212, 255, 255)
    )
    
    # Draw white camera body
    # path d="M7 10C7 8.89543 7.89543 8 9 8H15C16.1046 8 17 8.89543 17 10V16C17 17.1046 16.1046 18 15 18H9C7.89543 18 7 17.1046 7 16V10Z" fill="white"
    # Rect: (7, 8) to (17, 18)
    draw.rounded_rectangle(
        [7 * s, 8 * s, 17 * s, 18 * s],
        radius=1 * s,
        fill=(255, 255, 255, 255)
    )
    
    # Draw cyan lens
    # path d="M12 15C13.1046 15 14 14.1046 14 13C14 11.8954 13.1046 11 12 11C10.8954 11 10 11.8954 10 13C10 14.1046 10.8954 15 12 15Z" fill="#00d4ff"
    # Circle at (12, 13) radius 2
    r_lens = 2 * s
    draw.ellipse(
        [12 * s - r_lens, 13 * s - r_lens, 12 * s + r_lens, 13 * s + r_lens],
        fill=(0, 212, 255, 255)
    )
    
    # Top part (viewfinder/shutter)
    # path d="M9 8L10 6H14L15 8" stroke="white" stroke-width="2"
    draw.polygon(
        [(9 * s, 8 * s), (10 * s, 6 * s), (14 * s, 6 * s), (15 * s, 8 * s)],
        fill=(255, 255, 255, 255)
    )

    image.save("icon.png")

if __name__ == "__main__":
    generate_icon(128)
