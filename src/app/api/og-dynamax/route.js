import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export async function GET() {
    // Load Outfit font (same as site title)
    const outfitBold = await fetch(
        'https://fonts.gstatic.com/s/outfit/v15/QGYyz_MVcBeNP4NjuGObqx1XmO1I4bCyC4E.ttf'
    ).then(res => res.arrayBuffer());

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(180deg, #151515 0%, #0a0a0a 35%, #0a0a0a 65%, #151515 100%)',
                    fontFamily: 'Outfit, sans-serif',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Red glow behind text */}
                <div style={{
                    position: 'absolute',
                    top: '40%', left: '0%',
                    width: '100%', height: 400,
                    transform: 'translateY(-50%)',
                    background: 'radial-gradient(ellipse 60% 50%, rgba(220,38,38,0.22) 0%, rgba(180,28,28,0.06) 45%, transparent 75%)',
                    display: 'flex',
                }} />

                {/* Title - matching exact site style */}
                <div style={{
                    fontSize: 58,
                    fontWeight: 800,
                    letterSpacing: 0,
                    textTransform: 'uppercase',
                    color: '#ef4444',
                    lineHeight: 1,
                    display: 'flex',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    textShadow: '0 0 50px rgba(220,38,38,0.5), 0 0 100px rgba(220,38,38,0.15), 0 3px 5px rgba(0,0,0,0.9)',
                    wordSpacing: '0.5rem',
                }}>
                    Meilleurs Attaquants Dynamax
                </div>

                {/* Subtitle */}
                <div style={{
                    fontSize: 21,
                    color: 'rgba(255,255,255,0.4)',
                    fontWeight: 400,
                    marginTop: 36,
                    letterSpacing: 0.3,
                    display: 'flex',
                    textAlign: 'center',
                }}>
                    Les meilleurs attackers Dynamax &amp; Gigamax classés par type
                </div>

                {/* Bottom branding */}
                <div style={{
                    position: 'absolute', bottom: 28, display: 'flex',
                    alignItems: 'center',
                }}>
                    <div style={{
                        fontSize: 16, fontWeight: 600,
                        color: 'rgba(255,255,255,0.2)',
                        letterSpacing: 1,
                        display: 'flex',
                    }}>
                        pogosphere.com
                    </div>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
            fonts: [
                {
                    name: 'Outfit',
                    data: outfitBold,
                    weight: 800,
                    style: 'normal',
                },
            ],
        }
    );
}
