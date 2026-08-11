import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const ciWorkflow = readFileSync(
  new URL("../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);

describe("repository workflow policy", () => {
  it("keeps pull requests hosted and binds trusted main jobs to the approved group", () => {
    expect(ciWorkflow).toContain("name: Trusted head admission");
    expect(ciWorkflow).toContain("Reject external fork execution");
    expect(ciWorkflow).toContain("main-build-test:");
    expect(ciWorkflow).toContain("main_public_artifact_integrity:");
    expect(ciWorkflow).toContain("runs-on: ubuntu-latest");
    expect(ciWorkflow).toContain(
      "group: ${{ vars.CI_RUNNER_GROUP || 'Public CI - Quarantined' }}",
    );
    expect(ciWorkflow).toContain(
      "labels: ${{ fromJSON(vars.CI_RUNNER_LABELS || '[\"self-hosted\",\"Linux\",\"X64\"]') }}",
    );
    expect(ciWorkflow).not.toContain(
      "github.event_name == 'pull_request' && '[\"ubuntu-latest\"]'",
    );
  });
});
