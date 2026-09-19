/**
 * =============================================================================
 * GENERADOR DE ARCHIVOS ZIP CANÓNICO EN MEMORIA RAM VOLÁTIL (PILAR 2 SOC-2)
 * Cero dependencias externas | Cumplimiento estricto RFC 1951 / PKZIP 2.0
 * 100% In-Memory RAM | Apto para Serverless Vercel & Node.js 20+
 * =============================================================================
 */

import zlib from 'node:zlib';

/**
 * Tabla CRC-32 canónica para cálculo garantizado en cualquier versión de Node.js
 */
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
})();

function computeCrc32(buffer) {
  if (typeof zlib.crc32 === 'function') {
    return zlib.crc32(buffer) >>> 0;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC32_TABLE[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Convierte una fecha a formato MS-DOS (2 bytes tiempo, 2 bytes fecha)
 */
function toDosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;

  return { dosTime, dosDate };
}

/**
 * Crea un archivo ZIP canónico en memoria volátil a partir de un mapa de archivos
 * @param {Record<string, string | Buffer>} files Mapa con nombre de archivo y contenido
 * @returns {Buffer} Buffer en memoria RAM conteniendo el archivo ZIP completo
 */
export function createInMemoryZip(files) {
  const localChunks = [];
  const centralChunks = [];
  let currentOffset = 0;

  const now = new Date();
  const { dosTime, dosDate } = toDosDateTime(now);

  const entries = Object.entries(files);

  for (const [filename, content] of entries) {
    const rawData = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf8');
    const nameBuffer = Buffer.from(filename, 'utf8');

    const crc = computeCrc32(rawData);
    const uncompressedSize = rawData.length;

    // Compresión DEFLATE RAW sin cabeceras zlib
    const compressedData = zlib.deflateRawSync(rawData);
    const compressedSize = compressedData.length;

    // 1. Local File Header (30 bytes + name length + data length)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034B50, 0); // Local header signature
    localHeader.writeUInt16LE(20, 4);         // Version needed (2.0)
    localHeader.writeUInt16LE(0x0800, 6);     // General purpose bit flag (UTF-8)
    localHeader.writeUInt16LE(8, 8);          // Compression method: 8 (Deflate)
    localHeader.writeUInt16LE(dosTime, 10);   // Last mod time
    localHeader.writeUInt16LE(dosDate, 12);   // Last mod date
    localHeader.writeUInt32LE(crc, 14);       // CRC-32
    localHeader.writeUInt32LE(compressedSize, 18);   // Compressed size
    localHeader.writeUInt32LE(uncompressedSize, 22); // Uncompressed size
    localHeader.writeUInt16LE(nameBuffer.length, 26); // Filename length
    localHeader.writeUInt16LE(0, 28);         // Extra field length

    localChunks.push(localHeader, nameBuffer, compressedData);

    // 2. Central Directory Header (46 bytes + name length)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014B50, 0); // Central directory signature
    centralHeader.writeUInt16LE(20, 4);         // Version made by
    centralHeader.writeUInt16LE(20, 6);         // Version needed
    centralHeader.writeUInt16LE(0x0800, 8);     // General purpose flag (UTF-8)
    centralHeader.writeUInt16LE(8, 10);         // Compression method
    centralHeader.writeUInt16LE(dosTime, 12);   // Last mod time
    centralHeader.writeUInt16LE(dosDate, 14);   // Last mod date
    centralHeader.writeUInt32LE(crc, 16);       // CRC-32
    centralHeader.writeUInt32LE(compressedSize, 20);   // Compressed size
    centralHeader.writeUInt32LE(uncompressedSize, 24); // Uncompressed size
    centralHeader.writeUInt16LE(nameBuffer.length, 28); // Filename length
    centralHeader.writeUInt16LE(0, 30);         // Extra field length
    centralHeader.writeUInt16LE(0, 32);         // File comment length
    centralHeader.writeUInt16LE(0, 34);         // Disk number start
    centralHeader.writeUInt16LE(0, 36);         // Internal file attributes
    centralHeader.writeUInt32LE(0x81A40000, 38); // External file attributes (-rw-r--r--)
    centralHeader.writeUInt32LE(currentOffset, 42); // Relative offset of local header

    centralChunks.push(centralHeader, nameBuffer);

    currentOffset += localHeader.length + nameBuffer.length + compressedData.length;
  }

  const centralDirectoryOffset = currentOffset;
  const centralDirectorySize = centralChunks.reduce((acc, chunk) => acc + chunk.length, 0);

  // 3. End of Central Directory Record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054B50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4);          // Disk number
  eocd.writeUInt16LE(0, 6);          // Start disk
  eocd.writeUInt16LE(entries.length, 8);  // Records on this disk
  eocd.writeUInt16LE(entries.length, 10); // Total central directory records
  eocd.writeUInt32LE(centralDirectorySize, 12);    // Size of central directory
  eocd.writeUInt32LE(centralDirectoryOffset, 16);  // Offset of start of central directory
  eocd.writeUInt16LE(0, 20);         // Comment length

  return Buffer.concat([...localChunks, ...centralChunks, eocd]);
}
