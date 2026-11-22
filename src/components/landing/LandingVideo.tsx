import { useState } from "react";
import { Button, Typography } from "antd";
import CaretRightFilled from "@ant-design/icons/CaretRightFilled";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface LandingVideoProps {
  mutedColor: string;
}

/**
 * Demo video behind a still poster with a big play button. The native controls (and their dark
 * gradient) only appear once playing, so the poster is never half-covered. If the file fails to
 * load, the poster stays and a short message replaces the player.
 */
export default function LandingVideo({ mutedColor }: LandingVideoProps) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div>
      <div
        style={{
          position: "relative",
          aspectRatio: "16 / 9",
          borderRadius: 10,
          overflow: "hidden",
          background: "#000",
        }}
      >
        {playing && !failed ? (
          <video
            controls
            autoPlay
            playsInline
            aria-label={t("landing.videoLabel")}
            onError={() => setFailed(true)}
            style={{ display: "block", width: "100%", height: "100%" }}
          >
            <source src="/demo.mp4" type="video/mp4" onError={() => setFailed(true)} />
          </video>
        ) : (
          <>
            <img
              src="/demo-poster.jpg"
              alt={t("landing.posterAlt")}
              width={1600}
              height={900}
              style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
            />
            {!failed && (
              <Button
                type="primary"
                shape="circle"
                size="large"
                aria-label={t("landing.play")}
                icon={<CaretRightFilled />}
                onClick={() => setPlaying(true)}
                style={{
                  position: "absolute",
                  inset: 0,
                  margin: "auto",
                  width: 72,
                  height: 72,
                  fontSize: 30,
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)",
                }}
              />
            )}
          </>
        )}
      </div>
      <Text style={{ display: "block", marginTop: 12, color: mutedColor }}>
        {failed ? t("landing.videoError") : t("landing.videoCaption")}
      </Text>
    </div>
  );
}
