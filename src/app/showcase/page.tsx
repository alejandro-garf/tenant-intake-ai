"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Switch } from "@/components/Switch";
import { List, Row } from "@/components/List";
import { NavHeader } from "@/components/NavHeader";
import { TabBar, TabItem } from "@/components/TabBar";

export default function ShowcasePage() {
  const [isDark, setIsDark] = useState(false);
  const [switchChecked, setSwitchChecked] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="min-h-screen pb-32">
      <NavHeader title="iOS Design System" />

      <div className="py-6 space-y-8">
        {/* Introduction */}
        <div className="px-gutter">
          <p className="text-body text-secondary-label mb-4">
            A showcase of the iOS design system with elevation, materials, and motion.
            Scroll to see the frosted glass nav header collapse, press buttons and rows
            to feel the spring animations, and toggle dark mode to see the adaptive colors.
          </p>
        </div>

        {/* Dark Mode Toggle Section */}
        <div>
          <h2 className="text-title-3 px-gutter mb-4">Theme & Motion</h2>
          <List>
            <Row>
              <div className="flex items-center justify-between w-full">
                <div>
                  <span className="block text-body">Dark Mode</span>
                  <span className="block text-footnote text-secondary-label">
                    Toggle to see adaptive colors
                  </span>
                </div>
                <Switch checked={isDark} onCheckedChange={toggleDarkMode} />
              </div>
            </Row>
            <Row>
              <div className="flex items-center justify-between w-full">
                <div>
                  <span className="block text-body">Spring Toggle</span>
                  <span className="block text-footnote text-secondary-label">
                    Watch the thumb spring into place
                  </span>
                </div>
                <Switch
                  checked={switchChecked}
                  onCheckedChange={setSwitchChecked}
                />
              </div>
            </Row>
            <Row>
              <div className="flex items-center justify-between w-full">
                <div>
                  <span className="block text-body">Auto-Save</span>
                  <span className="block text-footnote text-secondary-label">
                    Enabled by default
                  </span>
                </div>
                <Switch checked={true} readOnly />
              </div>
            </Row>
          </List>
        </div>

        {/* Elevation & Shadows */}
        <div>
          <h2 className="text-title-3 px-gutter mb-4">Elevation & Depth</h2>
          <p className="text-callout text-secondary-label px-gutter mb-4">
            Cards visibly float above the recessed grouped background with a stronger
            two-part shadow (0 1px 2px, 0 10px 28px). The separation is clear, not flat.
            In dark mode, notice the subtle hairline highlight on top of cards.
          </p>
          <List>
            <Row>
              <div>
                <span className="block text-body">Grouped Background</span>
                <span className="block text-footnote text-secondary-label">
                  #F2F2F7 light / #1C1C1E dark (recessed base)
                </span>
              </div>
            </Row>
            <Row>
              <div>
                <span className="block text-body">Card Surface</span>
                <span className="block text-footnote text-secondary-label">
                  #FFFFFF light / #2C2C2E dark (elevated)
                </span>
              </div>
            </Row>
            <Row>
              <div>
                <span className="block text-body">Card Shadow</span>
                <span className="block text-footnote text-secondary-label">
                  0 1px 2px rgba(0,0,0,0.05), 0 10px 28px rgba(0,0,0,0.10)
                </span>
              </div>
            </Row>
          </List>
        </div>

        {/* Press Feedback - Buttons */}
        <div>
          <h2 className="text-title-3 px-gutter mb-4">Press Feedback</h2>
          <p className="text-callout text-secondary-label px-gutter mb-4">
            Filled buttons are solid #007AFF (#0A84FF dark) at rest with a blue glow
            shadow. They scale to 0.97 and dim to 0.9 opacity ONLY when actively pressed,
            with a spring animation (stiffness 400, damping 30).
          </p>
          <div className="px-gutter space-y-3">
            <div>
              <p className="text-subhead text-secondary-label mb-2">
                Filled (solid at rest, blue glow)
              </p>
              <Button variant="filled">Press Me</Button>
            </div>
            <div>
              <p className="text-subhead text-secondary-label mb-2">Tinted</p>
              <Button variant="tinted">Press Me</Button>
            </div>
            <div>
              <p className="text-subhead text-secondary-label mb-2">Plain</p>
              <Button variant="plain">Press Me</Button>
            </div>
            <div>
              <p className="text-subhead text-secondary-label mb-2">
                Disabled
              </p>
              <Button variant="filled" disabled>
                Disabled
              </Button>
            </div>
          </div>
        </div>

        {/* Interactive Rows */}
        <div>
          <h2 className="text-title-3 px-gutter mb-4">Interactive Lists</h2>
          <p className="text-callout text-secondary-label px-gutter mb-4">
            Rows with chevrons respond to press with the same spring feedback.
            Try pressing each row.
          </p>
          <List>
            <Row chevron onClick={() => alert("Account Settings pressed!")}>
              <div>
                <span className="block text-body">Account Settings</span>
                <span className="block text-footnote text-secondary-label">
                  Manage your account
                </span>
              </div>
            </Row>
            <Row chevron onClick={() => alert("Privacy pressed!")}>
              <div>
                <span className="block text-body">Privacy & Security</span>
                <span className="block text-footnote text-secondary-label">
                  Control your data
                </span>
              </div>
            </Row>
            <Row chevron onClick={() => alert("Notifications pressed!")}>
              <div>
                <span className="block text-body">Notifications</span>
                <span className="block text-footnote text-secondary-label">
                  Customize alerts
                </span>
              </div>
            </Row>
          </List>
        </div>

        {/* Materials - Frosted Glass */}
        <div>
          <h2 className="text-title-3 px-gutter mb-4">Frosted Glass Materials</h2>
          <p className="text-callout text-secondary-label px-gutter mb-4">
            The nav header and tab bar use frosted glass: translucent background
            (72% opacity) + backdrop-filter blur(20px) + saturate(180%) + hairline
            separator (0.5px). Content scrolls underneath.
          </p>
          <List>
            <Row>
              <div>
                <span className="block text-body">Nav Header</span>
                <span className="block text-footnote text-secondary-label">
                  Collapses on scroll with frosted effect
                </span>
              </div>
            </Row>
            <Row>
              <div>
                <span className="block text-body">Tab Bar</span>
                <span className="block text-footnote text-secondary-label">
                  Fixed at bottom with frosted effect
                </span>
              </div>
            </Row>
          </List>
        </div>

        {/* Typography */}
        <div>
          <h2 className="text-title-3 px-gutter mb-4">Type Polish & Text Lift</h2>
          <p className="text-callout text-secondary-label px-gutter mb-4">
            Global font-smoothing (antialiased) and negative letter-spacing for
            the lifted feel. LargeTitle -0.4px, Title -0.3px, Headline -0.2px.
            <br /><br />
            <strong>Text Lift:</strong> Large titles and section headers get a floating
            shadow (0 3px 6px light / 0 4px 10px dark) so glyphs sit ABOVE the surface.
            Body, captions, and row text stay crisp — never shadowed.
          </p>
          <div className="px-gutter space-y-4">
            <div>
              <p className="text-subhead text-secondary-label">Large Title (lifted)</p>
              <p className="text-large-title">The quick brown fox</p>
            </div>
            <div>
              <p className="text-subhead text-secondary-label">Title 1 (lifted)</p>
              <p className="text-title-1">The quick brown fox</p>
            </div>
            <div>
              <p className="text-subhead text-secondary-label">Title 2 (lifted)</p>
              <p className="text-title-2">The quick brown fox</p>
            </div>
            <div>
              <p className="text-subhead text-secondary-label">Title 3 (lifted)</p>
              <p className="text-title-3">The quick brown fox</p>
            </div>
            <div>
              <p className="text-subhead text-secondary-label">Headline (no lift)</p>
              <p className="text-headline">The quick brown fox</p>
            </div>
            <div>
              <p className="text-subhead text-secondary-label">Body (no lift, crisp)</p>
              <p className="text-body">The quick brown fox jumps over the lazy dog</p>
            </div>
          </div>
        </div>

        {/* Colors */}
        <div>
          <h2 className="text-title-3 px-gutter mb-4">iOS System Colors</h2>
          <p className="text-callout text-secondary-label px-gutter mb-4">
            Semantic colors adapt automatically in dark mode.
          </p>
          <div className="px-gutter space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-ios bg-system-blue shadow-card" />
              <span className="text-body">System Blue</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-ios bg-system-green shadow-card" />
              <span className="text-body">System Green</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-ios bg-system-red shadow-card" />
              <span className="text-body">System Red</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-ios bg-system-orange shadow-card" />
              <span className="text-body">System Orange</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-ios bg-system-purple shadow-card" />
              <span className="text-body">System Purple</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-ios bg-system-pink shadow-card" />
              <span className="text-body">System Pink</span>
            </div>
          </div>
        </div>

        {/* Reduced Motion */}
        <div>
          <h2 className="text-title-3 px-gutter mb-4">Accessibility</h2>
          <List>
            <Row>
              <div>
                <span className="block text-body">Reduced Motion Support</span>
                <span className="block text-footnote text-secondary-label">
                  Honors prefers-reduced-motion: disables scale transforms,
                  keeps opacity only
                </span>
              </div>
            </Row>
            <Row>
              <div>
                <span className="block text-body">Dynamic Type Ready</span>
                <span className="block text-footnote text-secondary-label">
                  Uses system font stack with proper line heights
                </span>
              </div>
            </Row>
          </List>
        </div>

        {/* Spacer for scrolling */}
        <div className="px-gutter">
          <div className="bg-secondary-grouped-background rounded-ios-card p-6 shadow-card card-highlight">
            <p className="text-footnote text-secondary-label text-center">
              Scroll up to see the nav header collapse into a centered title
              with frosted glass effect and hairline separator.
            </p>
          </div>
        </div>

        {/* Extra space to ensure scrolling */}
        <div className="h-96"></div>
      </div>

      {/* Bottom TabBar */}
      <TabBar>
        <TabItem
          icon={
            <svg
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          }
          label="Home"
          active={activeTab === 0}
          onClick={() => setActiveTab(0)}
        />
        <TabItem
          icon={
            <svg
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          }
          label="Search"
          active={activeTab === 1}
          onClick={() => setActiveTab(1)}
        />
        <TabItem
          icon={
            <svg
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          }
          label="Profile"
          active={activeTab === 2}
          onClick={() => setActiveTab(2)}
        />
      </TabBar>
    </div>
  );
}
