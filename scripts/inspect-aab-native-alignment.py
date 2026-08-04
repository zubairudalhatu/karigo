"""Inspect ELF load-segment alignment for native libraries in Android App Bundles."""

from __future__ import annotations

import argparse
import json
import struct
import zipfile
from pathlib import Path


PAGE_SIZE_16K = 16 * 1024
SIXTY_FOUR_BIT_ABIS = {"arm64-v8a", "x86_64"}


def load_segments(data: bytes) -> list[tuple[int, int, int]]:
    if data[:4] != b"\x7fELF":
        raise ValueError("not an ELF library")

    elf_class = data[4]
    endian = "<" if data[5] == 1 else ">"
    if elf_class == 2:
        program_offset = struct.unpack_from(endian + "Q", data, 32)[0]
        entry_size = struct.unpack_from(endian + "H", data, 54)[0]
        entry_count = struct.unpack_from(endian + "H", data, 56)[0]

        def entry(offset: int) -> tuple[int, int, int, int]:
            return (
                struct.unpack_from(endian + "I", data, offset)[0],
                struct.unpack_from(endian + "Q", data, offset + 8)[0],
                struct.unpack_from(endian + "Q", data, offset + 16)[0],
                struct.unpack_from(endian + "Q", data, offset + 48)[0],
            )
    elif elf_class == 1:
        program_offset = struct.unpack_from(endian + "I", data, 28)[0]
        entry_size = struct.unpack_from(endian + "H", data, 42)[0]
        entry_count = struct.unpack_from(endian + "H", data, 44)[0]

        def entry(offset: int) -> tuple[int, int, int, int]:
            return (
                struct.unpack_from(endian + "I", data, offset)[0],
                struct.unpack_from(endian + "I", data, offset + 4)[0],
                struct.unpack_from(endian + "I", data, offset + 8)[0],
                struct.unpack_from(endian + "I", data, offset + 28)[0],
            )
    else:
        raise ValueError(f"unsupported ELF class {elf_class}")

    segments = []
    for index in range(entry_count):
        segment_type, file_offset, virtual_address, alignment = entry(program_offset + index * entry_size)
        if segment_type == 1:
            segments.append((file_offset, virtual_address, alignment))
    return segments


def inspect(bundle: Path) -> dict[str, object]:
    abis: dict[str, dict[str, object]] = {}
    with zipfile.ZipFile(bundle) as archive:
        for name in archive.namelist():
            if not name.startswith("base/lib/") or not name.endswith(".so"):
                continue
            parts = name.split("/")
            abi = parts[2]
            library = parts[-1]
            result = abis.setdefault(abi, {"libraries": 0, "minimumLoadAlignment": None, "unsupportedLibraries": []})
            result["libraries"] = int(result["libraries"]) + 1
            unsupported = False
            for file_offset, virtual_address, alignment in load_segments(archive.read(name)):
                current_minimum = result["minimumLoadAlignment"]
                result["minimumLoadAlignment"] = alignment if current_minimum is None else min(int(current_minimum), alignment)
                if alignment < PAGE_SIZE_16K or (virtual_address - file_offset) % PAGE_SIZE_16K:
                    unsupported = True
            if unsupported:
                cast_list = result["unsupportedLibraries"]
                assert isinstance(cast_list, list)
                cast_list.append(library)

    unsupported_64_bit = sorted({
        library
        for abi, result in abis.items()
        if abi in SIXTY_FOUR_BIT_ABIS
        for library in result["unsupportedLibraries"]
    })
    return {
        "bundle": bundle.name,
        "abis": abis,
        "supports64BitAbi": "arm64-v8a" in abis,
        "pageAlignment16kFor64Bit": not unsupported_64_bit,
        "unsupported64BitLibraries": unsupported_64_bit,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("bundles", type=Path, nargs="+")
    args = parser.parse_args()
    results = [inspect(bundle.resolve()) for bundle in args.bundles]
    print(json.dumps(results, indent=2, sort_keys=True))
    if any(not result["pageAlignment16kFor64Bit"] for result in results):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
