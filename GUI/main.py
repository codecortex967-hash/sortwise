import tkinter as tk
from tkinter import ttk, filedialog
import socket
import json
import threading
import random
from PIL import Image, ImageTk

class SmartBinSimulation:
    def __init__(self, root):
        self.root = root
        self.root.title("Smart Bin Attachment Simulation")
        self.root.geometry("700x600")
        self.root.minsize(700, 600)
        self.root.configure(bg="#F2E7DD")
        
        # Configure main window grid
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(1, weight=1)
        
        # State tracking for UI elements
        self.comp_status_labels = {}
        self.fill_levels = {}
        self.progress_bars = {}
        self.fill_labels = {}

        # Category Colors
        self.cat_colors = {
            "Recyclable": "#BAE0DA", # Secondary (Light Blue/Mint)
            "Organic": "#7A958F",     # Primary (Sage Green)
            "Hazardous": "#D9899F"   # Accent (Pink/Red)
        }

        # Style configuration
        style = ttk.Style()
        try:
            style.theme_use('clam')
        except tk.TclError:
            pass # fallback to default if clam is not available
            
        style.configure("Title.TLabel", font=("Segoe UI", 24, "bold"), padding=15, background="#F2E7DD", foreground="#292421")
        style.configure("Section.TFrame", relief="solid", borderwidth=1, background="#ffffff")
        style.configure("SectionTitle.TLabel", font=("Segoe UI", 13, "bold"), padding=8, background="#292421", foreground="#ffffff")
        style.configure("TFrame", background="#F2E7DD")

        # 1. Main Title
        title_label = ttk.Label(self.root, text="SortWise Smart Bin Processing Simulation", style="Title.TLabel")
        title_label.grid(row=0, column=0, pady=(10, 0), sticky="n")

        # Main Content Frame
        content_frame = ttk.Frame(self.root, padding=10, style="TFrame")
        content_frame.grid(row=1, column=0, sticky="nsew")
        
        # Configure content frame grid
        content_frame.columnconfigure(0, weight=1)
        content_frame.columnconfigure(1, weight=1)
        content_frame.rowconfigure(0, weight=1)
        content_frame.rowconfigure(1, weight=1)

        # --- 1. Waste Image Input Section (Top Left) ---
        image_frame = ttk.Frame(content_frame, style="Section.TFrame", padding=10)
        image_frame.grid(row=0, column=0, padx=5, pady=5, sticky="nsew")
        ttk.Label(image_frame, text="1. Waste Image Input", style="SectionTitle.TLabel").pack(anchor="n")
        
        # Placeholder for image
        self.image_placeholder = ttk.Label(image_frame, text="[ Image Display Area ]", background="#F2E7DD", foreground="#292421", anchor="center")
        self.image_placeholder.pack(expand=True, fill="both", padx=10, pady=10)
        
        btn_frame = ttk.Frame(image_frame)
        btn_frame.pack(pady=5)
        ttk.Button(btn_frame, text="Select Image", command=self.upload_image).pack(side="left", padx=5)
        ttk.Button(btn_frame, text="Capture Camera").pack(side="left", padx=5)

        # --- 2. Detection Result Section (Top Right) ---
        detection_frame = ttk.Frame(content_frame, style="Section.TFrame", padding=10)
        detection_frame.grid(row=0, column=1, padx=5, pady=5, sticky="nsew")
        ttk.Label(detection_frame, text="2. Detection Result", style="SectionTitle.TLabel").pack(anchor="n")
        
        # Placeholder for results text
        self.result_text = tk.Text(detection_frame, height=5, width=30, wrap="word", bg="#ffffff", fg="#292421", font=("Consolas", 12), relief="solid", borderwidth=1)
        self.result_text.pack(expand=True, fill="both", padx=10, pady=10)
        
        self.result_text.insert("1.0", "Waiting for input...\n\nDetected Class: --\nConfidence Level: --%")
        self.result_text.config(state="disabled")

        # --- 3. Smart Bin Compartments Section (Bottom Left) ---
        compartments_frame = ttk.Frame(content_frame, style="Section.TFrame", padding=10)
        compartments_frame.grid(row=1, column=0, padx=5, pady=5, sticky="nsew")
        ttk.Label(compartments_frame, text="3. Smart Bin Compartments", style="SectionTitle.TLabel").pack(anchor="n")
        
        # Placeholder for compartments visual state
        comp_display = tk.Frame(compartments_frame, bg="#ffffff")
        comp_display.pack(expand=True, fill="both", pady=10)
        comp_display.columnconfigure((0, 1, 2), weight=1)
        comp_display.rowconfigure(0, weight=1)
        
        # Example compartment representation
        categories = ["Recyclable", "Organic", "Hazardous"]
        for i, comp in enumerate(categories):
            frame = tk.Frame(comp_display, relief="solid", borderwidth=1, bg="#ffffff")
            frame.grid(row=0, column=i, padx=5, sticky="nsew")
            
            # Simulated open/close status
            bg_color = self.cat_colors.get(comp, "#cccccc")
            lbl = tk.Label(frame, text=comp, bg=bg_color, fg="#ffffff" if comp != "Recyclable" else "#292421", font=("Segoe UI", 11, "bold"), pady=5)
            lbl.pack(fill="x", side="top")
            
            status_lbl = tk.Label(frame, text="CLOSED", fg="#555555", bg="#f0f0f0", font=("Segoe UI", 10, "bold"))
            status_lbl.pack(expand=True, fill="both")
            self.comp_status_labels[comp] = status_lbl

        # --- 4. Bin Fill Levels Section (Bottom Right) ---
        fill_levels_frame = ttk.Frame(content_frame, style="Section.TFrame", padding=10)
        fill_levels_frame.grid(row=1, column=1, padx=5, pady=5, sticky="nsew")
        ttk.Label(fill_levels_frame, text="4. Bin Fill Levels", style="SectionTitle.TLabel").pack(anchor="n")

        # Placeholder for fill level progress bars
        levels_display = tk.Frame(fill_levels_frame, bg="#ffffff")
        levels_display.pack(expand=True, fill="both", pady=5)
        
        for comp in categories:
            frame = tk.Frame(levels_display, bg="#ffffff")
            frame.pack(fill="x", pady=5)
            # Reduce width of label slightly to fit all 5 and color code
            lbl_title = tk.Label(frame, text=comp, width=10, font=("Segoe UI", 10, "bold"), bg=self.cat_colors.get(comp, "#cccccc"), fg="#ffffff" if comp != "Recyclable" else "#292421")
            lbl_title.pack(side="left", padx=(0, 10))
            pb = ttk.Progressbar(frame, orient="horizontal", mode="determinate", value=0)
            pb.pack(side="left", expand=True, fill="x", padx=10)
            lbl = tk.Label(frame, text="0%", width=4, bg="#ffffff", fg="#292421")
            lbl.pack(side="left")
            
            self.fill_levels[comp] = 0
            self.progress_bars[comp] = pb
            self.fill_labels[comp] = lbl

        # --- 5. System Status Message (Bottom) ---
        status_frame = ttk.Frame(self.root)
        status_frame.grid(row=2, column=0, sticky="ew")
        
        ttk.Separator(status_frame, orient="horizontal").pack(fill="x")
        
        self.status_var = tk.StringVar(value="System Status: Initialized and ready. Awaiting waste image.")
        self.status_label = tk.Label(status_frame, textvariable=self.status_var, bg="#F2E7DD", fg="#7A958F", font=("Segoe UI", 12, "bold italic"), pady=10)
        self.status_label.pack(anchor="w", padx=10)

        # --- 6. Copyright Footer ---
        footer_frame = ttk.Frame(self.root, style="TFrame")
        footer_frame.grid(row=3, column=0, sticky="ew")
        tk.Label(footer_frame, text="© all copyright reserved by SortWise", font=("Segoe UI", 8), bg="#F2E7DD", fg="#5A5451").pack(side="right", padx=10, pady=2)

        # Start UDP Listener
        self.root.after(100, self.start_udp_listener)

    def upload_image(self):
        file_path = filedialog.askopenfilename(
            title="Select Waste Image",
            filetypes=[("Image files", "*.png;*.jpg;*.jpeg;*.bmp")]
        )
        if file_path:
            try:
                img = Image.open(file_path)
                img.thumbnail((250, 250))
                self.photo = ImageTk.PhotoImage(img) # Keep a reference to prevent garbage collection
                self.image_placeholder.config(image=self.photo, text="")
                
                filename = file_path.split("/")[-1] if "/" in file_path else file_path.split("\\")[-1]
                
                # Simulated AI Detection
                ai_choices = [
                    ("Plastic Bottle", "Recyclable"),
                    ("Paper", "Recyclable"),
                    ("Banana Peel", "Organic"),
                    ("Food Waste", "Organic"),
                    ("Battery", "Hazardous")
                ]
                item, category = random.choice(ai_choices)
                confidence = random.randint(85, 98)
                
                # Send data to update UI method
                self.update_gui_from_sim({
                    "class": category,
                    "confidence": confidence,
                    "item": item,
                    "category": category
                })
                
                self.status_var.set(f"System Status: Uploaded '{filename}'. AI detected '{item}'.")
            except Exception as e:
                self.status_var.set(f"System Status: Failed to load image ({e})")

    def start_udp_listener(self):
        self.udpd_thread = threading.Thread(target=self.udp_listen, daemon=True)
        self.udpd_thread.start()
        
    def udp_listen(self):
        UDP_IP = "127.0.0.1"
        UDP_PORT = 5005
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.bind((UDP_IP, UDP_PORT))
        
        while True:
            try:
                data, addr = sock.recvfrom(1024)
                message = json.loads(data.decode())
                # Safely update GUI from the main thread
                self.root.after(0, lambda m=message: self.update_gui_from_sim(m))
            except Exception as e:
                print(f"UDP error: {e}")
                
    def update_gui_from_sim(self, data):
        waste_class = data.get("class", "--")
        confidence = data.get("confidence", "--")
        item = data.get("item", waste_class) # Use bin class if item not provided
        category = data.get("category", waste_class) # Use bin class if category not provided
        
        # 1. Update Detection Result
        self.result_text.config(state="normal")
        self.result_text.delete("1.0", tk.END)
        self.result_text.insert("1.0", f"--- AI Detection Result ---\n\nDetected Item: {item}\nWaste Category: {category}\nConfidence: {confidence}%\n\nAction: Opening {waste_class} bin.")
        self.result_text.config(state="disabled")
        
        # 2. Open correct compartment visually (temporarily)
        for comp, lbl in self.comp_status_labels.items():
            if comp == waste_class:
                status_color = "#dc3545" if category == "Hazardous" else "#28a745" # Red for hazardous, green otherwise
                lbl.config(text="OPENING", fg="white", bg=status_color)
            else:
                lbl.config(text="INACTIVE", fg="#aaaaaa", bg="#e9e9e9")
                
        # 3. Update fill level
        if waste_class in self.fill_levels:
            self.fill_levels[waste_class] += 10 # add 10% per item
            if self.fill_levels[waste_class] > 100:
                self.fill_levels[waste_class] = 100
                
            self.progress_bars[waste_class]['value'] = self.fill_levels[waste_class]
            self.fill_labels[waste_class].config(text=f"{self.fill_levels[waste_class]}%")
            
        # 4. Update status
        self.status_var.set(f"System Status: Segregated {waste_class} item successfully.")
        
        # Schedule closing the compartment after 2 seconds
        self.root.after(2000, lambda c=waste_class: self.close_compartment(c))
        
    def close_compartment(self, comp):
        for c, lbl in self.comp_status_labels.items():
            lbl.config(text="CLOSED", fg="#555555", bg="#f0f0f0")
        self.status_var.set("System Status: Awaiting next item.")

if __name__ == "__main__":
    root = tk.Tk()
    app = SmartBinSimulation(root)
    root.mainloop()
