param(
  [double]$Offset = 10.9,
  [double]$Duration = 0.7,
  [switch]$Inspect
)
$ErrorActionPreference = 'Stop'
$sourcePath = Join-Path $PSScriptRoot '../assets/sound/137706__dansotak__pumpkin_carvingstabbing.wav'
$outputPath = Join-Path $PSScriptRoot '../assets/sound/pumpkin-carve.wav'

# Read PCM samples directly so preparing this one short WAV needs no external codec.
Add-Type -TypeDefinition @'
using System;
using System.IO;
public static class CarvingAudio {
  public static void Prepare(string path, string output, double offset, double duration, bool inspect) {
    byte[] bytes = File.ReadAllBytes(path);
    int channels = 0, rate = 0, bits = 0, format = 0, start = 0, size = 0;
    using (var reader = new BinaryReader(new MemoryStream(bytes))) {
      if (new string(reader.ReadChars(4)) != "RIFF") throw new Exception("Expected RIFF WAV");
      reader.ReadInt32();
      if (new string(reader.ReadChars(4)) != "WAVE") throw new Exception("Expected WAVE");
      while (reader.BaseStream.Position + 8 <= bytes.Length) {
        string id = new string(reader.ReadChars(4));
        int length = reader.ReadInt32();
        long next = reader.BaseStream.Position + length + (length % 2);
        if (id == "fmt ") {
          format = reader.ReadUInt16(); channels = reader.ReadUInt16(); rate = reader.ReadInt32();
          reader.ReadInt32(); reader.ReadUInt16(); bits = reader.ReadUInt16();
        } else if (id == "data") { start = (int)reader.BaseStream.Position; size = length; }
        reader.BaseStream.Position = next;
      }
    }
    if (format != 1 || bits != 24 || channels != 2 || start == 0)
      throw new Exception("Expected stereo 24-bit PCM source");
    int frameBytes = channels * 3, frames = size / frameBytes;
    var mono = new double[frames];
    for (int frame = 0; frame < frames; frame++) {
      for (int channel = 0; channel < channels; channel++) {
        int pos = start + frame * frameBytes + channel * 3;
        int sample = bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16);
        if ((sample & 0x800000) != 0) sample |= unchecked((int)0xff000000);
        mono[frame] += sample / 8388608.0 / channels;
      }
    }
    if (inspect) {
      Console.WriteLine("Source: {0} Hz, {1:F3} seconds", rate, frames / (double)rate);
      int window = rate / 2;
      for (int i = 0; i + window <= frames; i += window) {
        double squares = 0, peak = 0;
        for (int j = i; j < i + window; j++) { squares += mono[j] * mono[j]; peak = Math.Max(peak, Math.Abs(mono[j])); }
        double rms = Math.Sqrt(squares / window);
        if (rms > 0.005) Console.WriteLine("{0:F1}s RMS {1:F1} dBFS peak {2:F1}", i / (double)rate, 20 * Math.Log10(rms), 20 * Math.Log10(peak));
      }
      return;
    }
    int first = (int)Math.Round(offset * rate), count = (int)Math.Round(duration * rate);
    if (first < 0 || count <= 0 || first + count > frames) throw new Exception("Trim outside source");
    if (File.Exists(output)) throw new Exception("Output exists; preserve it before preparing a replacement");
    double max = 0;
    for (int i = 0; i < count; i++) max = Math.Max(max, Math.Abs(mono[first + i]));
    double gain = max > 0 ? 0.8 / max : 1;
    using (var writer = new BinaryWriter(File.Create(output))) {
      writer.Write(System.Text.Encoding.ASCII.GetBytes("RIFF")); writer.Write(36 + count * 2);
      writer.Write(System.Text.Encoding.ASCII.GetBytes("WAVEfmt ")); writer.Write(16);
      writer.Write((short)1); writer.Write((short)1); writer.Write(rate); writer.Write(rate * 2);
      writer.Write((short)2); writer.Write((short)16);
      writer.Write(System.Text.Encoding.ASCII.GetBytes("data")); writer.Write(count * 2);
      for (int i = 0; i < count; i++) {
        double fade = Math.Min(1, Math.Min(i / (rate * 0.01), (count - 1 - i) / (rate * 0.04)));
        writer.Write((short)Math.Round(mono[first + i] * gain * fade * 32767));
      }
    }
    Console.WriteLine("Saved {0}: {1:F3}s from {2:F3}s, mono 16-bit, gain {3:F2}", output, duration, offset, gain);
  }
}
'@
[CarvingAudio]::Prepare($sourcePath, $outputPath, $Offset, $Duration, $Inspect.IsPresent)
