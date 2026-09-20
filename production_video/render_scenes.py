import json
import subprocess
import os

with open("production_video/timeline.json", "r", encoding="utf-8") as f:
    data = json.load(f)

scenes = data["scenes"]
fps = 30

# List of camera movements (Ken Burns variations) for variety
MOVEMENTS = [
    # 01: Slow push-in center
    "zoompan=z='min(zoom+0.0006,1.10)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
    # 02: Slow pan slightly right
    "zoompan=z='min(zoom+0.0005,1.08)':x='iw/2-(iw/zoom/2)+(on/30)*2':y='ih/2-(ih/zoom/2)'",
    # 03: Slow push-in right side (profile)
    "zoompan=z='min(zoom+0.0006,1.10)':x='iw*0.6-(iw/zoom/2)':y='ih*0.45-(ih/zoom/2)'",
    # 04: Macro push-in center (watch)
    "zoompan=z='min(zoom+0.0007,1.12)':x='iw*0.55-(iw/zoom/2)':y='ih*0.6-(ih/zoom/2)'",
    # 05: Forward push-in center (stride)
    "zoompan=z='min(zoom+0.0006,1.10)':x='iw/2-(iw/zoom/2)':y='ih*0.4-(ih/zoom/2)'",
    # 06: Slow push-in left side
    "zoompan=z='min(zoom+0.0005,1.09)':x='iw*0.4-(iw/zoom/2)':y='ih*0.45-(ih/zoom/2)'",
    # 07: Medium close push-in
    "zoompan=z='min(zoom+0.0006,1.10)':x='iw*0.52-(iw/zoom/2)':y='ih*0.4-(ih/zoom/2)'",
    # 08: Subtle pull back
    "zoompan=z='if(lte(zoom,1.0),1.10,max(1.001,zoom-0.0005))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
    # 09: Slow drift left
    "zoompan=z='min(zoom+0.0005,1.08)':x='iw/2-(iw/zoom/2)-(on/30)*2':y='ih*0.45-(ih/zoom/2)'",
    # 10: Push-in on smile
    "zoompan=z='min(zoom+0.0006,1.11)':x='iw*0.52-(iw/zoom/2)':y='ih*0.35-(ih/zoom/2)'",
    # 11: Push-in over shoulder
    "zoompan=z='min(zoom+0.0006,1.10)':x='iw*0.55-(iw/zoom/2)':y='ih*0.4-(ih/zoom/2)'",
    # 12: Push-in on handshake
    "zoompan=z='min(zoom+0.0007,1.12)':x='iw/2-(iw/zoom/2)':y='ih*0.55-(ih/zoom/2)'",
    # 13: Pull back revealing agreement
    "zoompan=z='if(lte(zoom,1.0),1.10,max(1.001,zoom-0.0005))':x='iw/2-(iw/zoom/2)':y='ih*0.4-(ih/zoom/2)'",
    # 14: Steady push forward in lobby
    "zoompan=z='min(zoom+0.0006,1.10)':x='iw/2-(iw/zoom/2)':y='ih*0.45-(ih/zoom/2)'",
    # 15: Grand push-in on twilight skyline
    "zoompan=z='min(zoom+0.0007,1.14)':x='iw*0.52-(iw/zoom/2)':y='ih*0.4-(ih/zoom/2)'"
]

concat_list = []

for idx, sc in enumerate(scenes, start=1):
    dur = sc["scene_duration"]
    img_file = f"production_video/images/scene_{idx:02d}.jpg"
    audio_file = f"production_video/audio/scene_{idx:02d}.mp3"
    out_clip = f"production_video/scenes/scene_{idx:02d}.mp4"
    total_frames = int(dur * fps) + 5
    motion = MOVEMENTS[idx - 1]
    
    # Filter graph: zoompan with d=total_frames:s=1920x1080:fps=30, then format=yuv420p
    vf = f"{motion}:d={total_frames}:s=1920x1080:fps={fps},format=yuv420p"
    
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-i", img_file,
        "-i", audio_file,
        "-vf", vf,
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k",
        "-t", str(dur),
        "-pix_fmt", "yuv420p",
        out_clip
    ]
    
    print(f"Rendering Scene {idx:02d} ({dur}s)...")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        print(f"Error on scene {idx}: {res.stderr.decode('utf-8', errors='ignore')[:300]}")
    else:
        print(f"Scene {idx:02d} rendered successfully -> {out_clip}")
        concat_list.append(f"file 'scenes/scene_{idx:02d}.mp4'\n")

with open("production_video/concat_list.txt", "w", encoding="utf-8") as f:
    f.writelines(concat_list)

print("\nAll scenes rendered! Ready to concatenate.")
