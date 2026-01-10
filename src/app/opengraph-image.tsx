import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Artha - Free Trading Journal & Analytics";
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = "image/png";

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #FAFBF6 0%, #E8EFE0 50%, #C8D6B9 100%)",
                    position: "relative",
                }}
            >
                {/* Decorative blobs */}
                <div
                    style={{
                        position: "absolute",
                        top: -100,
                        right: -100,
                        width: 400,
                        height: 400,
                        borderRadius: "50%",
                        background: "rgba(46, 74, 59, 0.1)",
                        filter: "blur(60px)",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: -50,
                        left: -50,
                        width: 300,
                        height: 300,
                        borderRadius: "50%",
                        background: "rgba(229, 152, 137, 0.2)",
                        filter: "blur(50px)",
                    }}
                />

                {/* Main content */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10,
                    }}
                >
                    {/* Logo mark */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 80,
                            height: 80,
                            borderRadius: 20,
                            background: "#2E4A3B",
                            marginBottom: 24,
                        }}
                    >
                        <span
                            style={{
                                fontSize: 48,
                                fontWeight: 700,
                                color: "white",
                                fontFamily: "Georgia, serif",
                            }}
                        >
                            A
                        </span>
                    </div>

                    {/* Brand name */}
                    <h1
                        style={{
                            fontSize: 72,
                            fontWeight: 700,
                            color: "#2E4A3B",
                            fontFamily: "Georgia, serif",
                            margin: 0,
                            letterSpacing: "-2px",
                        }}
                    >
                        Artha
                    </h1>

                    {/* Tagline */}
                    <p
                        style={{
                            fontSize: 32,
                            color: "#2E4A3B",
                            opacity: 0.8,
                            margin: "16px 0 0 0",
                            fontFamily: "system-ui, sans-serif",
                        }}
                    >
                        Master your mindset.{" "}
                        <span style={{ color: "#E59889", fontStyle: "italic" }}>
                            Refine your edge.
                        </span>
                    </p>

                    {/* Feature pills */}
                    <div
                        style={{
                            display: "flex",
                            gap: 16,
                            marginTop: 40,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                padding: "12px 24px",
                                background: "rgba(46, 74, 59, 0.1)",
                                borderRadius: 50,
                                fontSize: 18,
                                color: "#2E4A3B",
                                fontFamily: "system-ui, sans-serif",
                            }}
                        >
                            Instant Sync
                        </div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                padding: "12px 24px",
                                background: "rgba(46, 74, 59, 0.1)",
                                borderRadius: 50,
                                fontSize: 18,
                                color: "#2E4A3B",
                                fontFamily: "system-ui, sans-serif",
                            }}
                        >
                            Analytics
                        </div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                padding: "12px 24px",
                                background: "rgba(46, 74, 59, 0.1)",
                                borderRadius: 50,
                                fontSize: 18,
                                color: "#2E4A3B",
                                fontFamily: "system-ui, sans-serif",
                            }}
                        >
                            Free Forever
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div
                    style={{
                        position: "absolute",
                        bottom: 40,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 20,
                        color: "#2E4A3B",
                        opacity: 0.6,
                        fontFamily: "system-ui, sans-serif",
                    }}
                >
                    arthatrades.com
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
