import {
    AbsoluteFill,
    interpolate,
    spring,
    useCurrentFrame,
    useVideoConfig,
    Img,
    staticFile,
    Sequence,
} from 'remotion';

const ArthaGreen = '#2E4A3B';
const ArthaCream = '#FAFBF6';
const ArthaCoral = '#E59889';

const Scene: React.FC<{
    title: string;
    subtitle?: string;
    image?: string;
    zoom?: boolean;
    showLogo?: boolean;
}> = ({ title, subtitle, image, zoom, showLogo = false }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const entrance = spring({
        frame,
        fps,
        config: { damping: 12 },
    });

    const contentOpacity = interpolate(frame, [0, 15, 45, 60], [0, 1, 1, 0]);
    const scale = zoom ? interpolate(frame, [0, 60], [1, 1.1]) : 1;

    return (
        <AbsoluteFill
            style={{
                backgroundColor: ArthaCream,
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
            }}
        >
            {image && (
                <AbsoluteFill style={{ transform: `scale(${scale})`, opacity: 0.4 }}>
                    <Img
                        src={staticFile(`assets/${image}`)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </AbsoluteFill>
            )}

            {/* Corner Logo Watermark for Content Scenes */}
            {image && (
                <div style={{
                    position: 'absolute',
                    top: 40,
                    right: 40,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    opacity: 0.8
                }}>
                    <Img src={staticFile('assets/correct_logo.png')} style={{ height: 50, borderRadius: '12px' }} />
                    <span style={{ color: ArthaGreen, fontSize: 28, fontWeight: 700, fontFamily: 'system-ui' }}>Artha</span>
                </div>
            )}

            <div
                style={{
                    opacity: contentOpacity,
                    textAlign: 'center',
                    transform: `translateY(${interpolate(entrance, [0, 1], [50, 0])}px)`,
                    zIndex: 10,
                    padding: '60px',
                    borderRadius: '40px',
                    backgroundColor: 'rgba(250, 251, 246, 0.85)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 30px 60px rgba(46, 74, 59, 0.12)',
                    border: `1px solid rgba(46, 74, 59, 0.1)`,
                    width: '70%',
                    maxWidth: '1000px'
                }}
            >
                {showLogo && (
                    <div style={{ marginBottom: 30, display: 'flex', justifyContent: 'center' }}>
                        <Img
                            src={staticFile('assets/correct_logo.png')}
                            style={{
                                height: 160,
                                borderRadius: '24px',
                                transform: `scale(${entrance})`,
                                filter: 'drop-shadow(0 15px 30px rgba(46, 74, 59, 0.2))'
                            }}
                        />
                    </div>
                )}
                <h2
                    style={{
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        fontSize: showLogo ? 110 : 85,
                        fontWeight: 800,
                        color: ArthaGreen,
                        margin: 0,
                        letterSpacing: '-0.04em',
                        lineHeight: 1.1
                    }}
                >
                    {title}
                </h2>
                {subtitle && (
                    <p
                        style={{
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            fontSize: 38,
                            color: ArthaCoral,
                            marginTop: 20,
                            fontWeight: 500,
                            opacity: 0.9
                        }}
                    >
                        {subtitle}
                    </p>
                )}
            </div>
        </AbsoluteFill>
    );
};

export const Main: React.FC = () => {
    const { fps } = useVideoConfig();

    return (
        <AbsoluteFill style={{ backgroundColor: ArthaCream }}>
            {/* Scene 1: Intro with Correct Logo */}
            <Sequence from={0} durationInFrames={fps * 2.5}>
                <Scene title="Artha" subtitle="Your Trades Tell a Story." showLogo />
            </Sequence>

            {/* Scene 2: Hero */}
            <Sequence from={fps * 2.5} durationInFrames={fps * 2.5}>
                <Scene
                    title="Automated Journaling"
                    subtitle="Stop manual spreadsheets. Direct broker sync."
                    image="hero.png"
                    zoom
                />
            </Sequence>

            {/* Scene 3: Dashboard */}
            <Sequence from={fps * 5} durationInFrames={fps * 2.5}>
                <Scene
                    title="Visual Metrics"
                    subtitle="Identify your edge in seconds."
                    image="dashboard.png"
                    zoom
                />
            </Sequence>

            {/* Scene 4: Reports */}
            <Sequence from={fps * 7.5} durationInFrames={fps * 2.5}>
                <Scene
                    title="Master Your Psychology"
                    subtitle="Discover and eliminate toxic setups."
                    image="reports.png"
                    zoom
                />
            </Sequence>

            {/* Scene 5: Pricing/CTA */}
            <Sequence from={fps * 10} durationInFrames={fps * 2.5}>
                <Scene
                    title="Start Free Today"
                    subtitle="Compatible with 100+ brokers."
                    image="pricing.png"
                    zoom
                />
            </Sequence>

            {/* Scene 6: Outro with Correct Logo */}
            <Sequence from={fps * 12.5} durationInFrames={fps * 2.5}>
                <Scene title="Artha" subtitle="Master Your Edge at arthatrades.com" showLogo />
            </Sequence>
        </AbsoluteFill>
    );
};
