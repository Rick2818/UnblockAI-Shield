#!/usr/bin/env python3
"""
=============================================================================
MEDIA & ARCHIVE INSPECTOR — DESTRABA AI / UNBLOCK AI
Soporte completo para visualización, extracción y análisis forense de:
- Archivos comprimidos (.zip)
- Archivos de video (.mp4, .mov, .mkv, .avi)
=============================================================================
"""

import sys
import os
import zipfile
import json
from pathlib import Path

# Configuración UTF-8 para consolas de Windows
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

try:
    import cv2
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False


def inspect_zip(file_path: str, extract_to: str = None, view_file: str = None):
    """Inspecciona el contenido de un archivo .zip y permite extraerlo o leer archivos internos."""
    path = Path(file_path).resolve()
    if not path.exists():
        print(f"❌ Error: El archivo ZIP '{path}' no existe.")
        return False

    print("=" * 80)
    print(f"📦 INSPECCIÓN DE ARCHIVO ZIP: {path.name}")
    print(f"Ruta completa: {path}")
    print(f"Tamaño total: {path.stat().st_size:,} bytes ({path.stat().st_size / (1024*1024):.2f} MB)")
    print("=" * 80)

    try:
        with zipfile.ZipFile(path, 'r') as z:
            infolist = z.infolist()
            print(f"Total de elementos contenidos: {len(infolist)}")
            print("-" * 80)
            print(f"{'Nombre':<50} {'Tamaño (Bytes)':<15} {'Fecha':<20}")
            print("-" * 80)
            
            total_uncompressed = 0
            for info in infolist:
                date_str = f"{info.date_time[0]}-{info.date_time[1]:02d}-{info.date_time[2]:02d} {info.date_time[3]:02d}:{info.date_time[4]:02d}"
                print(f"{info.filename:<50} {info.file_size:<15,} {date_str:<20}")
                total_uncompressed += info.file_size

            print("-" * 80)
            print(f"Espacio total descomprimido: {total_uncompressed:,} bytes ({total_uncompressed / (1024*1024):.2f} MB)")

            if view_file:
                if view_file in z.namelist():
                    print(f"\n📄 CONTENIDO DE '{view_file}':")
                    print("=" * 80)
                    content = z.read(view_file).decode('utf-8', errors='replace')
                    print(content[:2000] + ("\n... [Truncado]" if len(content) > 2000 else ""))
                    print("=" * 80)
                else:
                    print(f"⚠️ El archivo '{view_file}' no se encuentra dentro del ZIP.")

            if extract_to:
                out_dir = Path(extract_to).resolve()
                out_dir.mkdir(parents=True, exist_ok=True)
                z.extractall(out_dir)
                print(f"\n✅ Archivo descomprimido exitosamente en: {out_dir}")

        return True
    except Exception as e:
        print(f"❌ Error al abrir ZIP: {e}")
        return False


def inspect_video(file_path: str, extract_frames: bool = True, interval_sec: float = 5.0, out_dir: str = None):
    """Inspecciona metadatos de un video (.mp4) y extrae capturas de escenas clave."""
    path = Path(file_path).resolve()
    if not path.exists():
        print(f"❌ Error: El archivo de video '{path}' no existe.")
        return False

    print("=" * 80)
    print(f"🎬 INSPECCIÓN DE VIDEO: {path.name}")
    print(f"Ruta: {path}")
    print(f"Tamaño: {path.stat().st_size:,} bytes ({path.stat().st_size / (1024*1024):.2f} MB)")
    print("=" * 80)

    if not HAS_OPENCV:
        print("⚠️ OpenCV no está disponible. No se pueden extraer fotogramas ni metadatos visuales.")
        return False

    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        print(f"❌ No se pudo abrir el stream de video en '{path}'.")
        return False

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration_sec = total_frames / fps if fps > 0 else 0

    print(f"• Resolución: {width} x {height} píxeles")
    print(f"• Cuadros por segundo (FPS): {fps:.2f}")
    print(f"• Total de fotogramas: {total_frames:,}")
    print(f"• Duración total: {duration_sec:.2f} segundos ({duration_sec/60:.2f} minutos)")
    print("=" * 80)

    if extract_frames and duration_sec > 0:
        if not out_dir:
            out_dir = path.parent / f"{path.stem}_frames"
        else:
            out_dir = Path(out_dir)
        out_dir.mkdir(parents=True, exist_ok=True)

        print(f"\n📸 Extrayendo fotogramas de escenas cada {interval_sec} segundos...")
        frame_interval = int(fps * interval_sec)
        if frame_interval < 1:
            frame_interval = 1

        saved_count = 0
        current_frame = 0

        while current_frame < total_frames:
            cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame)
            ret, frame = cap.read()
            if not ret:
                break

            timestamp_sec = current_frame / fps
            frame_filename = out_dir / f"scene_{saved_count+1:02d}_t{int(timestamp_sec):02d}s.jpg"
            cv2.imwrite(str(frame_filename), frame)
            print(f"  ✓ Escena {saved_count+1:02d} guardada en {timestamp_sec:.1f}s -> {frame_filename.name}")
            saved_count += 1
            current_frame += frame_interval

        print(f"✅ Se extrajeron {saved_count} fotogramas clave en: {out_dir}")

    cap.release()
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso:")
        print("  python media_inspector.py <archivo.zip> [--extract-to <directorio>] [--view-file <nombre>]")
        print("  python media_inspector.py <video.mp4> [--interval <segundos>] [--out-dir <directorio>]")
        sys.exit(1)

    target_path = sys.argv[1]
    ext = Path(target_path).suffix.lower()

    if ext == '.zip':
        extract_to = None
        view_f = None
        if '--extract-to' in sys.argv:
            idx = sys.argv.index('--extract-to')
            if idx + 1 < len(sys.argv):
                extract_to = sys.argv[idx + 1]
        if '--view-file' in sys.argv:
            idx = sys.argv.index('--view-file')
            if idx + 1 < len(sys.argv):
                view_f = sys.argv[idx + 1]
        inspect_zip(target_path, extract_to=extract_to, view_file=view_f)

    elif ext in ['.mp4', '.mov', '.avi', '.mkv', '.webm']:
        interval = 5.0
        out_dir = None
        if '--interval' in sys.argv:
            idx = sys.argv.index('--interval')
            if idx + 1 < len(sys.argv):
                interval = float(sys.argv[idx + 1])
        if '--out-dir' in sys.argv:
            idx = sys.argv.index('--out-dir')
            if idx + 1 < len(sys.argv):
                out_dir = sys.argv[idx + 1]
        inspect_video(target_path, extract_frames=True, interval_sec=interval, out_dir=out_dir)

    else:
        print(f"Formato '{ext}' no reconocido para inspección automática. Use .zip o video (.mp4, .mov, etc.).")
