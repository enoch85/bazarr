import { FunctionComponent, useState } from "react";
import {
  Alert,
  Box,
  Button,
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
      <Section header="Use Plex Media Server">
        <Check label="Enabled" settingKey={plexEnabledKey}></Check>
      </Section>
      <CollapseBox settingKey={plexEnabledKey}>
        {/* New Beautiful Authentication Section */}
        <Paper p="xl" radius="md" style={{ marginBottom: "20px" }}>
          <Stack gap="lg">
            {/* OAuth Section - Prominent */}
            <Box>
              <PlexSettings />
            </Box>

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
                onClick={() => setManualConfigOpen(!manualConfigOpen)}
                style={{
                  fontWeight: 500,
                }}
              >
                Manual Configuration (click to expand)
              </Button>

              <Collapse in={manualConfigOpen}>
                <Paper p="lg" mt="sm" radius="md" withBorder>
                  <Stack gap="md">
                    <Alert color="brand" variant="light">
                      This legacy manual configuration is not needed when using
                      Plex OAuth above.
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
