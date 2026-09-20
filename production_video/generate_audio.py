import asyncio
import edge_tts
import json
import subprocess
import os

VOICEOVER_LINES = [
    "En el mundo empresarial actual, el tiempo y la certeza son los activos más valiosos de cualquier organización.",
    "Identificar el momento exacto para evolucionar requiere visión estratégica y un liderazgo dispuesto a dar el siguiente paso.",
    "Cada desafío corporativo demanda soluciones a la medida, lejos de fórmulas genéricas o respuestas improvisadas.",
    "Porque la verdadera precisión no se mide en intenciones, sino en la capacidad de ejecutar con absoluta puntualidad.",
    "El primer paso hacia la transformación comienza cuando decidimos buscar la alianza correcta en el mercado.",
    "Entender a profundidad las necesidades de un cliente es la base indispensable de cualquier propuesta de valor.",
    "Nuestro servicio no busca imponer cambios drásticos, sino articular soluciones fluidas que potencien el modelo actual.",
    "La claridad en cada etapa del proceso permite construir una relación basada en la transparencia y la confianza mutua.",
    "Escuchar con atención y adaptarse al contexto de cada negocio marca la diferencia entre un proveedor y un socio.",
    "Diseñamos cada solución con el rigor técnico y la solidez necesarios para garantizar un retorno tangible.",
    "Cuando los objetivos de ambas partes se alinean, los acuerdos se consolidan de manera natural y sostenible.",
    "Un apretón de manos representa mucho más que un contrato firmado; simboliza un compromiso de resultados.",
    "El éxito de una estrategia integral se refleja de inmediato en la tranquilidad de quienes toman las decisiones.",
    "Contar con el respaldo adecuado permite a las organizaciones avanzar con paso firme hacia sus metas más ambiciosas.",
    "Construir el futuro de una empresa es posible cuando la visión correcta se une con el servicio indicado."
]

VOICE = "es-ES-AlvaroNeural"  # Professional, mature, authoritative executive male voice

def get_duration(file_path):
    cmd = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", file_path
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return float(res.stdout.strip())

async def main():
    durations = []
    total_time = 0.0
    for idx, text in enumerate(VOICEOVER_LINES, start=1):
        filename = f"production_video/audio/scene_{idx:02d}.mp3"
        communicate = edge_tts.Communicate(text, VOICE, rate="-4%", pitch="-1Hz")
        await communicate.save(filename)
        dur = get_duration(filename)
        # Add 0.5s padding so scene doesn't cut off abruptly
        scene_dur = round(dur + 0.6, 2)
        durations.append({
            "scene": idx,
            "text": text,
            "audio_file": filename,
            "audio_duration": dur,
            "scene_duration": scene_dur
        })
        total_time += scene_dur
        print(f"Scene {idx:02d}: audio {dur:.2f}s -> scene {scene_dur:.2f}s")
    
    with open("production_video/timeline.json", "w", encoding="utf-8") as f:
        json.dump({"total_duration": total_time, "scenes": durations}, f, indent=2, ensure_ascii=False)
    
    print(f"\nAll 15 voiceovers generated successfully. Total estimated video duration: {total_time:.2f}s (~{int(total_time//60)}m {int(total_time%60)}s)")

if __name__ == "__main__":
    asyncio.run(main())
