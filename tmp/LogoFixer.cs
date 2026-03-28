using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;

public class LogoFixer {
    public static void Process(string input, string output) {
        using (Bitmap bmp = new Bitmap(input)) {
            int w = bmp.Width;
            int h = bmp.Height;
            Bitmap newBmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
            using (Graphics g = Graphics.FromImage(newBmp)) {
                g.DrawImage(bmp, 0, 0);
            }
            
            bool[,] visited = new bool[w, h];
            Queue<Point> q = new Queue<Point>();
            
            // Identifying if a pixel is "white-ish"
            Func<int, int, bool> isWhite = (x, y) => {
                Color p = newBmp.GetPixel(x, y);
                return p.R > 235 && p.G > 235 && p.B > 235;
            };

            // Flood fill from edges to find background white
            for (int x = 0; x < w; x++) {
                if (isWhite(x, 0)) q.Enqueue(new Point(x, 0));
                if (isWhite(x, h - 1)) q.Enqueue(new Point(x, h - 1));
            }
            for (int y = 1; y < h - 1; y++) {
                if (isWhite(0, y)) q.Enqueue(new Point(0, y));
                if (isWhite(w - 1, y)) q.Enqueue(new Point(w - 1, y));
            }

            while (q.Count > 0) {
                Point p = q.Dequeue();
                if (p.X < 0 || p.X >= w || p.Y < 0 || p.Y >= h || visited[p.X, p.Y]) continue;
                visited[p.X, p.Y] = true;
                
                // Directions
                int[] dx = {1, -1, 0, 0};
                int[] dy = {0, 0, 1, -1};
                for (int i = 0; i < 4; i++) {
                    int nx = p.X + dx[i];
                    int ny = p.Y + dy[i];
                    if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[nx, ny] && isWhite(nx, ny)) {
                        q.Enqueue(new Point(nx, ny));
                    }
                }
            }

            // Apply: Visited white -> Transparent, Unvisited white -> Black
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    if (isWhite(x, y)) {
                        if (visited[x, y]) {
                            newBmp.SetPixel(x, y, Color.Transparent);
                        } else {
                            newBmp.SetPixel(x, y, Color.Black);
                        }
                    }
                }
            }
            newBmp.Save(output, ImageFormat.Png);
        }
    }
}
