import { useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Award } from "lucide-react";
import type { Adoption } from "@shared/schema";

interface Props {
  adoption: Adoption | null;
  username: string;
  onClose: () => void;
}

export function AdoptionCertificate({ adoption, username, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDownload = useCallback(() => {
    if (!adoption || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 900;
    const H = 580;
    canvas.width = W;
    canvas.height = H;

    const draw = (img: HTMLImageElement | null) => {
      drawCertificate(ctx, W, H, img, adoption, username);
      const link = document.createElement("a");
      link.download = `coral-certificate-${adoption.coralName.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => draw(img);
    img.onerror = () => draw(null);
    img.src = adoption.coralImage;
  }, [adoption, username]);

  if (!adoption) return null;

  const dateStr = new Date(adoption.adoptedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Dialog open={!!adoption} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl border-white/10 bg-[#0a0a1a] text-white shadow-2xl p-0 overflow-hidden">
        <canvas ref={canvasRef} className="hidden" />

        <DialogHeader className="sr-only">
          <DialogTitle>Adoption Certificate</DialogTitle>
        </DialogHeader>

        {/* Certificate preview */}
        <div
          className="relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #020b2e 0%, #052698 55%, #0a1a4a 100%)",
            padding: "2.5rem 2rem",
          }}
        >
          <div className="absolute inset-4 rounded-lg border border-[#21bcee]/25 pointer-events-none" />
          <div className="absolute inset-[22px] rounded-lg border border-[#21bcee]/10 pointer-events-none" />
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#21bcee]/5 pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-[#116bf8]/10 pointer-events-none" />

          <div className="relative flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-[#21bcee]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#21bcee]">
                Adopt a Reef
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Certificate of Adoption
              </h2>
              <div className="mt-2 h-px w-40 mx-auto bg-gradient-to-r from-transparent via-[#21bcee]/50 to-transparent" />
            </div>

            <div
              className="h-24 w-24 overflow-hidden rounded-full shadow-[0_0_32px_rgba(33,188,238,0.35)]"
              style={{ border: "3px solid rgba(33,188,238,0.45)" }}
            >
              <img
                src={adoption.coralImage}
                alt={adoption.coralName}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-sm text-white/55">This certifies that</p>
              <p className="text-xl font-bold text-white">{username}</p>
              <p className="text-sm text-white/55">
                has adopted{" "}
                <span className="font-semibold text-white">
                  {adoption.amount === 1 ? "a" : adoption.amount}
                </span>
              </p>
              <p className="text-xl font-bold text-[#21bcee]">{adoption.coralName}</p>
              <p className="text-xs text-white/35">in support of coral reef conservation</p>
            </div>

            <p className="text-[11px] text-white/25 mt-1">{dateStr}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/10">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="button-certificate-close"
            className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            Close
          </Button>
          <Button
            onClick={handleDownload}
            data-testid="button-download-certificate"
            className="gap-2 bg-gradient-to-r from-[#052698] via-[#116bf8] to-[#21bcee] text-white hover:opacity-90"
          >
            <Download className="h-4 w-4" />
            Download Certificate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function drawCertificate(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  coralImg: HTMLImageElement | null,
  adoption: Adoption,
  username: string,
) {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#020b2e");
  bg.addColorStop(0.55, "#052698");
  bg.addColorStop(1, "#0a1a4a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(33,188,238,0.05)";
  ctx.beginPath();
  ctx.arc(W + 20, -20, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-20, H + 20, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(33,188,238,0.45)";
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, W - 36, H - 36);
  ctx.strokeStyle = "rgba(33,188,238,0.12)";
  ctx.lineWidth = 1;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  ctx.fillStyle = "#21bcee";
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ADOPT A REEF", W / 2, 66);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px Arial, sans-serif";
  ctx.fillText("Certificate of Adoption", W / 2, 112);

  const divGrd = ctx.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0);
  divGrd.addColorStop(0, "rgba(33,188,238,0)");
  divGrd.addColorStop(0.5, "rgba(33,188,238,0.55)");
  divGrd.addColorStop(1, "rgba(33,188,238,0)");
  ctx.strokeStyle = divGrd;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 200, 130);
  ctx.lineTo(W / 2 + 200, 130);
  ctx.stroke();

  if (coralImg) {
    const cx = W / 2;
    const cy = 224;
    const r = 68;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(coralImg, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    ctx.strokeStyle = "rgba(33,188,238,0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  const textTop = coralImg ? 328 : 170;

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText("This certifies that", W / 2, textTop);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 30px Arial, sans-serif";
  ctx.fillText(username, W / 2, textTop + 40);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "16px Arial, sans-serif";
  const qty = adoption.amount === 1 ? "a" : String(adoption.amount);
  ctx.fillText(`has adopted ${qty}`, W / 2, textTop + 76);

  ctx.fillStyle = "#21bcee";
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.fillText(adoption.coralName, W / 2, textTop + 112);

  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "13px Arial, sans-serif";
  ctx.fillText("in support of coral reef conservation", W / 2, textTop + 140);

  const dateStr = new Date(adoption.adoptedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.font = "12px Arial, sans-serif";
  ctx.fillText(dateStr, W / 2, H - 42);
}
