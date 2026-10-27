# Deterministically cut the Developer's 4x2 sheets into the existing 418x360 frame format.
# Originals are read only. Output names are new; reruns require -Replace to preserve edits.
param([switch]$Replace, [ValidateSet('all','idle','walk','hang')][string]$Pose = 'all')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;

public static class BasketSprites {
  const int FrameWidth = 418, FrameHeight = 360;
  public class Shape {
    public Rectangle Bounds;
    public int Count;
    public List<int> Pixels = new List<int>();
  }
  // Eight-connected regions distinguish the skin of the head/fist from the basket,
  // and discard isolated alpha specks without touching the painted silhouette.
  static List<Shape> Regions(Bitmap image, Func<Color, bool> includes) {
    int width = image.Width, height = image.Height;
    var seen = new bool[width * height];
    var regions = new List<Shape>();
    var queue = new Queue<int>();
    for (int y = 0; y < height; y++) for (int x = 0; x < width; x++) {
      int index = y * width + x;
      if (seen[index] || !includes(image.GetPixel(x, y))) continue;
      seen[index] = true; queue.Enqueue(index);
      int left=x, right=x, top=y, bottom=y, count=0;
      var pixels = new List<int>();
      while (queue.Count > 0) {
        int point=queue.Dequeue(), px=point%width, py=point/width;
        pixels.Add(point);
        left=Math.Min(left,px); right=Math.Max(right,px);
        top=Math.Min(top,py); bottom=Math.Max(bottom,py); count++;
        for(int dy=-1;dy<=1;dy++) for(int dx=-1;dx<=1;dx++) {
          int nx=px+dx, ny=py+dy;
          if(nx<0 || ny<0 || nx>=width || ny>=height) continue;
          int next=ny*width+nx;
          if(seen[next] || !includes(image.GetPixel(nx,ny))) continue;
          seen[next]=true; queue.Enqueue(next);
        }
      }
      regions.Add(new Shape { Bounds=Rectangle.FromLTRB(left,top,right+1,bottom+1), Count=count, Pixels=pixels });
    }
    regions.Sort((a,b)=>b.Count.CompareTo(a.Count));
    return regions;
  }
  static bool Skin(Color c) {
    return c.A>128 && c.R>160 && c.G>45 && c.R>c.G*1.3 && c.G>c.B*1.5;
  }
  static Bitmap Cell(Bitmap image, int frame, bool strip) {
    int width=strip?FrameWidth:image.Width/4, height=strip?FrameHeight:image.Height/2;
    return image.Clone(new Rectangle(strip?frame*width:(frame%4)*width,
      strip?0:(frame/4)*height,width,height),PixelFormat.Format32bppArgb);
  }
  static List<Shape> Frames(Bitmap image) {
    var regions=Regions(image,c=>c.A>32);
    regions.RemoveAll(region=>region.Count<3000);
    if(regions.Count!=8) throw new Exception("Expected 8 separate sprites; found "+regions.Count);
    regions.Sort((a,b)=> {
      int rowA=a.Bounds.Top/(image.Height/2), rowB=b.Bounds.Top/(image.Height/2);
      return rowA!=rowB?rowA.CompareTo(rowB):a.Bounds.Left.CompareTo(b.Bounds.Left);
    });
    return regions;
  }
  static Bitmap Sprite(Bitmap image, Shape shape) {
    // Generated sheets are nominally 4x2, but capes/baskets cross cell boundaries.
    // Extract connected silhouettes rather than cutting a rigid grid through the art.
    var bounds=Rectangle.Intersect(new Rectangle(shape.Bounds.X-2,shape.Bounds.Y-2,
      shape.Bounds.Width+4,shape.Bounds.Height+4),new Rectangle(0,0,image.Width,image.Height));
    var result=new Bitmap(bounds.Width,bounds.Height,PixelFormat.Format32bppArgb);
    foreach(int point in shape.Pixels) {
      int px=point%image.Width, py=point/image.Width;
      for(int dy=-1;dy<=1;dy++) for(int dx=-1;dx<=1;dx++) {
        int x=px+dx,y=py+dy;
        if(bounds.Contains(x,y)) result.SetPixel(x-bounds.X,y-bounds.Y,image.GetPixel(x,y));
      }
    }
    return result;
  }
  static Rectangle Fist(Bitmap cell, Rectangle head) {
    Shape fist=null;
    foreach(var region in Regions(cell,Skin)) if(region.Count>80 && region.Bounds.Top<head.Top-10
      && (fist==null || region.Bounds.Top<fist.Bounds.Top)) fist=region;
    if(fist==null) throw new Exception("No raised fist");
    return fist.Bounds;
  }
  public static void Build(string source, string reference, string destination, string pose, string preview, bool alignedGrid) {
    using(var input=new Bitmap(source)) using(var original=new Bitmap(reference))
    using(var output=new Bitmap(FrameWidth*8,FrameHeight,PixelFormat.Format32bppArgb))
    using(var contact=new Bitmap(FrameWidth*4,FrameHeight*2,PixelFormat.Format32bppArgb))
    using(var graphics=Graphics.FromImage(output)) using(var grid=Graphics.FromImage(contact)) {
      graphics.InterpolationMode=InterpolationMode.HighQualityBicubic;
      graphics.PixelOffsetMode=PixelOffsetMode.HighQuality;
      grid.Clear(Color.FromArgb(255,30,24,47));
      grid.InterpolationMode=InterpolationMode.HighQualityBicubic;
      // The idle sheet is an aligned grid whose neighboring cape tips touch.
      // The walk/hang sheets need connected extraction because art crosses grid cells.
      var frames=alignedGrid?null:Frames(input);
      // Developer chose a slightly smaller hang figure. One scale must fit ALL
      // frames around the fixed fist hotspot, so the size never pulses mid-animation.
      float hangScale=float.MaxValue;
      if(pose=="hang") for(int i=0;i<8;i++) using(var cell=alignedGrid?Cell(input,i,false):Sprite(input,frames[i]))
      using(var old=Cell(original,i,true)) {
        var art=Regions(cell,c=>c.A>32)[0].Bounds;
        var head=Regions(cell,Skin)[0].Bounds;
        var fist=Fist(cell,head);
        float fistX=fist.Left+(fist.Width-1)/2f, fistY=fist.Top+2;
        float anchorX=FrameWidth/2f-FrameWidth*0.1627f, anchorY=FrameHeight*0.0372f;
        hangScale=Math.Min(hangScale,(float)Regions(old,Skin)[0].Bounds.Width/head.Width);
        hangScale=Math.Min(hangScale,(FrameHeight-2-anchorY)/(art.Bottom-fistY));
        if(fistY>art.Top) hangScale=Math.Min(hangScale,(anchorY-2)/(fistY-art.Top));
        if(fistX>art.Left) hangScale=Math.Min(hangScale,(anchorX-2)/(fistX-art.Left));
        if(art.Right>fistX) hangScale=Math.Min(hangScale,(FrameWidth-2-anchorX)/(art.Right-fistX));
      }
      for(int i=0;i<8;i++) using(var cell=alignedGrid?Cell(input,i,false):Sprite(input,frames[i])) using(var old=Cell(original,i,true)) {
        var art=Regions(cell,c=>c.A>32)[0].Bounds;
        var head=Regions(cell,Skin)[0].Bounds;
        var oldHead=Regions(old,Skin)[0].Bounds;
        float scale=pose=="hang"?hangScale:256f/art.Height;
        float headX=head.Left+(head.Width-1)/2f;
        float x=FrameWidth/2f-headX*scale;
        float y=FrameHeight-(art.Bottom)*scale;
        if(pose=="hang") {
          // The raised fist is the topmost substantial skin island above the head.
          var fist=Fist(cell,head);
          float fistX=fist.Left+(fist.Width-1)/2f;
          // Align every hang frame to the SAME fist hotspot used by pointer geometry.
          x=(FrameWidth/2f-FrameWidth*0.1627f)-fistX*scale;
          y=FrameHeight*0.0372f-(fist.Top+2)*scale;
        }
        if(x+art.Left*scale<0 || x+art.Right*scale>FrameWidth || y+art.Top*scale<0
          || y+art.Bottom*scale>FrameHeight+1) throw new Exception("Clipped "+pose+" frame "+i);
        // Use the main silhouette bounds with a small antialias margin. Transparent
        // RGB colors are preserved by normal alpha compositing; no background removal.
        var crop=Rectangle.Intersect(new Rectangle(art.X-2,art.Y-2,art.Width+4,art.Height+4),
          new Rectangle(0,0,cell.Width,cell.Height));
        var target=new RectangleF(i*FrameWidth+x+crop.X*scale,y+crop.Y*scale,crop.Width*scale,crop.Height*scale);
        graphics.DrawImage(cell,target,crop,GraphicsUnit.Pixel);
        Console.WriteLine(pose+" "+i+": scale="+scale.ToString("F4")+" head="+(head.Width*scale).ToString("F1")+
          " referenceHead="+oldHead.Width+" artHeight="+(art.Height*scale).ToString("F1")+
          " bounds="+(x+art.Left*scale).ToString("F1")+","+(y+art.Top*scale).ToString("F1")+","+
          (x+art.Right*scale).ToString("F1")+","+(y+art.Bottom*scale).ToString("F1"));
      }
      output.Save(destination,ImageFormat.Png);
      for(int i=0;i<8;i++) {
        var target=new Rectangle((i%4)*FrameWidth,(i/4)*FrameHeight,FrameWidth,FrameHeight);
        grid.DrawImage(output,target,new Rectangle(i*FrameWidth,0,FrameWidth,FrameHeight),GraphicsUnit.Pixel);
      }
      contact.Save(preview,ImageFormat.Png);
    }
  }
}
'@
$artDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'assets/art'
$previewDir = Join-Path ([IO.Path]::GetTempPath()) ('halloween-basket-frames-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $previewDir | Out-Null
$sheets = @(
  @('idle', 'vampire-basket-idle-1772x886.png'),
  @('walk', 'exec-52c8fc0a-cd53-4890-823f-45e4ba01e7be.png'),
  @('hang', 'exec-f67e14e2-4c18-4a6d-8f9e-73ec3127f8ca.png')
)
foreach ($sheet in $sheets) {
  if ($Pose -ne 'all' -and $sheet[0] -ne $Pose) { continue }
  $outputPath = Join-Path $artDir ('char-vamp-basket-' + $sheet[0] + '.png')
  if ((Test-Path -LiteralPath $outputPath) -and !$Replace) { throw "Output exists: $outputPath. Preserve it before rerunning with -Replace." }
  if (Test-Path -LiteralPath $outputPath) {
    Copy-Item -LiteralPath $outputPath -Destination (Join-Path $previewDir ('previous-' + $sheet[0] + '.png'))
  }
  [BasketSprites]::Build((Join-Path $artDir $sheet[1]),
    (Join-Path $artDir ('char-vamp-' + $sheet[0] + '.png')), $outputPath, $sheet[0],
    (Join-Path $previewDir ($sheet[0] + '.png')), ($sheet[0] -eq 'idle'))
}
Write-Output ('Frame previews: ' + $previewDir)
