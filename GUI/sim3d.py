from ursina import *
import socket
import json
import threading
import time
import random

# UDP Configuration
UDP_IP = "127.0.0.1"
UDP_PORT = 5005

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

def send_update(waste_type, confidence):
    data = {"class": waste_type, "confidence": confidence}
    try:
        sock.sendto(json.dumps(data).encode(), (UDP_IP, UDP_PORT))
        print(f"Sent update: {data}")
    except Exception as e:
        print(f"Failed to send UDP message: {e}")

app = Ursina()
window.title = "Smart Bin 3D Simulation"
window.borderless = False
window.fullscreen = False
window.exit_button.visible = False
window.fps_counter.enabled = False
window.color = color.color(0, 0, 0.95) # Soft light background

# Camera setup
camera.position = (0, 7, -18)
camera.rotation_x = 12

# Lighting & Environment
ambient_light = AmbientLight(color=color.rgba(100, 100, 100, 0.1))
dir_light = DirectionalLight(y=2, z=3, shadows=True, color=color.white)
dir_light.look_at(Vec3(1, -1, 1))

ground = Entity(model='plane', scale=(40, 1, 40), color=color.gray, texture='white_cube')

# The sleek metallic bin enclosure
bin_base = Entity(model='cube', position=(0, 0, 0), scale=(6.2, 0.2, 4.2), color=color.dark_gray)
bin_back = Entity(model='cube', position=(0, 2, 2.1), scale=(6.2, 4, 0.2), color=color.color(0, 0, 0.8, 0.9))
bin_front = Entity(model='cube', position=(0, 2, -2.1), scale=(6.2, 4, 0.2), color=color.color(0, 0, 0.8, 0.5))
bin_left = Entity(model='cube', position=(-3.0, 2, 0), scale=(0.2, 4, 4.2), color=color.color(0, 0, 0.8, 0.9))
bin_right = Entity(model='cube', position=(3.0, 2, 0), scale=(0.2, 4, 4.2), color=color.color(0, 0, 0.8, 0.9))

# Dividers (3 compartments)
div1 = Entity(model='cube', position=(-1.0, 2, 0), scale=(0.1, 3.8, 4), color=color.white50)
div2 = Entity(model='cube', position=(1.0, 2, 0), scale=(0.1, 3.8, 4), color=color.white50)

# Neon glowing headers for compartments
Text(text="RECYCLABLE", position=(-0.45, 0.22), scale=1.5, color=color.cyan, origin=(0,0))
Text(text="ORGANIC", position=(-0.05, 0.22), scale=1.5, color=color.yellow, origin=(0,0))
Text(text="HAZARDOUS", position=(0.35, 0.22), scale=1.5, color=color.red, origin=(0,0))

# Interactive Flash Overlay
flash_overlay = Entity(model='quad', color=color.clear, scale=(20, 20), z=-1)

class Waste(Entity):
    def __init__(self, waste_type, target_x, c, model_type):
        super().__init__(
            model=model_type,
            color=c,
            scale=(0.6, 0.6, 0.6) if model_type == 'sphere' else (0.5, 0.8, 0.5) if model_type == 'cylinder' else (0.7, 0.2, 0.5),
            position=(0, 10, 0),
            collider='box'
        )
        self.waste_type = waste_type
        self.target_x = target_x
        self.state = "falling_to_scanner"
        self.speed = 5
        self.confidence = random.randint(85, 99)
        self.rot_speed_x = random.uniform(50, 150)
        self.rot_speed_y = random.uniform(50, 150)
        
    def update(self):
        # Rotate while falling
        if self.state != "done":
            self.rotation_x += self.rot_speed_x * time.dt
            self.rotation_y += self.rot_speed_y * time.dt
            
        if self.state == "falling_to_scanner":
            self.y -= self.speed * time.dt
            if self.y <= 6:
                self.y = 6
                self.state = "scanning"
                # Visual scanner flash
                flash_overlay.color = color.rgba(255, 255, 255, 100)
                flash_overlay.animate_color(color.clear, duration=0.5)
                invoke(self.finish_scan, delay=0.8)
                
        elif self.state == "moving_to_bin":
            direction = 1 if self.target_x > self.x else -1
            if abs(self.target_x - self.x) > 0.1:
                self.x += direction * (self.speed * 1.5) * time.dt
            else:
                self.x = self.target_x
                self.state = "dropping"
                
        elif self.state == "dropping":
            self.y -= self.speed * 1.5 * time.dt
            if self.y <= 1.5:
                self.y = 1.5
                self.state = "done"

    def finish_scan(self):
        send_update(self.waste_type, self.confidence)
        self.state = "moving_to_bin"

# Elegant UI Box for Controls
Panel(scale=(0.3, 0.35), position=(-0.7, 0.3), color=color.rgba(0, 0, 0, 200))
Text(text="WASTE INPUT", position=(-0.82, 0.43), scale=1.5, color=color.white, origin=(0,0))
Text(text="[1] Drop Plastic\n[2] Drop Paper\n[3] Drop Battery\n[4] Drop Banana\n[5] Drop Food\n[ESC] Quit", 
     position=(-0.82, 0.28), scale=1.2, color=color.light_gray, origin=(0,0), line_height=1.4)

def input(key):
    if key == '1':
        Waste("Recyclable", -2.0, color.cyan, 'cylinder') # Plastic Bottle
    elif key == '2':
        Waste("Recyclable", -2.0, color.white, 'cube') # Paper
    elif key == '3':
        Waste("Hazardous", 2.0, color.red, 'cylinder') # Battery
    elif key == '4':
        Waste("Organic", 0.0, color.yellow, 'sphere') # Banana Peel
    elif key == '5':
        Waste("Organic", 0.0, color.green, 'sphere') # Food Waste
        
    if key == 'escape':
        application.quit()

app.run()
