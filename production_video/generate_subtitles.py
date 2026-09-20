import json

with open("production_video/timeline.json", "r", encoding="utf-8") as f:
    data = json.load(f)

def format_time(seconds):
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"

srt_lines = []
current_time = 0.0

for idx, sc in enumerate(data["scenes"], start=1):
    start = current_time + 0.1
    end = current_time + sc["audio_duration"] + 0.2
    srt_lines.append(f"{idx}\n")
    srt_lines.append(f"{format_time(start)} --> {format_time(end)}\n")
    srt_lines.append(f"{sc['text']}\n\n")
    current_time += sc["scene_duration"]

with open("production_video/subtitles.srt", "w", encoding="utf-8") as f:
    f.writelines(srt_lines)

print("Subtitles generated successfully at production_video/subtitles.srt")
