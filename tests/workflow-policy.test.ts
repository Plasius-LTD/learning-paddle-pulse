import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const ciWorkflow = readFileSync(
  new URL("../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);
const cdWorkflow = readFileSync(
  new URL("../.github/workflows/cd.yml", import.meta.url),
  "utf8",
);

describe("repository workflow policy", () => {
  it("keeps pull requests hosted and binds trusted main jobs to the approved group", () => {
    expect(ciWorkflow).toContain("name: Trusted head admission");
    expect(ciWorkflow).toContain("Reject external fork execution");
    expect(ciWorkflow).toContain("main-build-test:");
    expect(ciWorkflow).toContain("main_public_artifact_integrity:");
    expect(ciWorkflow).toContain("runs-on: ubuntu-latest");
    expect(ciWorkflow).toContain("group: Public CI - Quarantined");
    expect(ciWorkflow).toContain("labels: [self-hosted, Linux, X64]");
    expect(ciWorkflow).toContain("package-manager-cache: false");
    expect(ciWorkflow).not.toContain("cache: 'npm'");
    expect(ciWorkflow).not.toContain(
      "github.event_name == 'pull_request' && '[\"ubuntu-latest\"]'",
    );
  });

  it("publishes immutable artifacts from the protected production job", () => {
    expect(cdWorkflow).toContain("environment: production");
    expect(cdWorkflow).toContain("NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}");
    expect(cdWorkflow).toContain('registry-url: "https://registry.npmjs.org"');
    expect(cdWorkflow).toContain("--ignore-scripts");
    expect(cdWorkflow).toContain("--provenance");
    expect(cdWorkflow).toContain("Verify immutable publication bundle");
  });
});
