import { FunctionComponent, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Collapse,
  Group,
  Paper,
  Stack,
  Text as MantineText,
} from "@mantine/core";
import PlexSettings from "@/components/PlexSettings";
import {
  Check,
  CollapseBox,
  Layout,
  Message,
  Number,
  Section,
  Text,
} from "@/pages/Settings/components";
import { plexEnabledKey } from "@/pages/Settings/keys";

const SettingsPlexView: FunctionComponent = () => {
  const [manualConfigOpen, setManualConfigOpen] = useState(false);

  return (
    <Layout name="Interface">
      <Section header="Use Plex operations">
        <Check label="Enabled" settingKey={plexEnabledKey}></Check>
      </Section>
      <CollapseBox settingKey={plexEnabledKey}>
        {/* New Beautiful Authentication Section */}
        <Paper p="xl" radius="md" withBorder style={{ marginBottom: "20px" }}>
          <Stack gap="lg">
            <MantineText size="xl" fw={600} c="dark.8">
              How would you like to authenticate?
            </MantineText>

            {/* OAuth Section - Prominent */}
            <Card
              padding="xl"
              radius="md"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Badge
                color="yellow"
                variant="filled"
                size="lg"
                style={{
                  position: "absolute",
                  top: 15,
                  right: 15,
                  fontWeight: 700,
                }}
              >
                recommended
              </Badge>

              <PlexSettings />
            </Card>

            {/* Manual Configuration - Collapsible */}
            <Box>
              <Button
                variant="subtle"
                color="gray"
                size="md"
                leftSection={
                  <MantineText size="sm">
                    {manualConfigOpen ? "▲" : "▼"}
                  </MantineText>
                }
                rightSection={<MantineText size="sm">⚙️</MantineText>}
                onClick={() => setManualConfigOpen(!manualConfigOpen)}
                style={{
                  fontWeight: 500,
                  color: "#868e96",
                }}
              >
                Manual Configuration (click to expand)
              </Button>

              <Collapse in={manualConfigOpen}>
                <Paper
                  p="lg"
                  mt="sm"
                  radius="md"
                  style={{
                    backgroundColor: "#f8f9fa",
                    border: "1px solid #e9ecef",
                  }}
                >
                  <Stack gap="md">
                    <Alert
                      icon={<MantineText size="sm">ℹ️</MantineText>}
                      color="blue"
                      variant="light"
                    >
                      This manual configuration is not needed when using Plex
                      OAuth above.
                    </Alert>

                    <Group grow>
                      <Text
                        label="Address"
                        settingKey="settings-plex-ip"
                      ></Text>
                      <Number
                        label="Port"
                        settingKey="settings-plex-port"
                        defaultValue={32400}
                      ></Number>
                    </Group>

                    <Text
                      label="API Token"
                      settingKey="settings-plex-apikey"
                    ></Text>
                    <Check label="SSL" settingKey="settings-plex-ssl"></Check>
                  </Stack>
                </Paper>
              </Collapse>
            </Box>
          </Stack>
        </Paper>

        <Section header="Movie library">
          <Text
            label="Name of the library"
            settingKey="settings-plex-movie_library"
          ></Text>
          <Check
            label="Mark the movie as recently added after downloading subtitles"
            settingKey="settings-plex-set_movie_added"
          ></Check>
          <Check
            label="Scan library for new files after downloading subtitles"
            settingKey="settings-plex-update_movie_library"
          ></Check>
          <Message>Can be helpful for remote media files</Message>
        </Section>
        <Section header="Series library">
          <Text
            label="Name of the library"
            settingKey="settings-plex-series_library"
          ></Text>
          <Check
            label="Mark the episode as recently added after downloading subtitles"
            settingKey="settings-plex-set_episode_added"
          ></Check>
          <Check
            label="Scan library for new files after downloading subtitles"
            settingKey="settings-plex-update_series_library"
          ></Check>
          <Message>Can be helpful for remote media files</Message>
        </Section>
      </CollapseBox>
    </Layout>
  );
};

export default SettingsPlexView;
