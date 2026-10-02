import { GarageSlot } from '../../components/garage/GarageSlot';
import { AppLink } from '../AppLink';
import {
  BUILD_STEPS,
  BUILD_STEP_LABELS,
  metaOf,
  neighbourSteps,
  pathOf,
  type BuildStep,
} from '../routes';

export interface BuildStepPageProps {
  readonly step: BuildStep;
}

/**
 * One builder step. Every step renders this same component, so React keeps the 3D preview
 * mounted while the visitor moves between steps.
 */
export function BuildStepPage({ step }: BuildStepPageProps) {
  const meta = metaOf({ name: 'build', step });
  const { previous, next } = neighbourSteps(step);

  return (
    <>
      <h1 tabIndex={-1}>{meta.heading}</h1>
      <p>Placeholder: the parts for this step arrive in Phase 2.</p>
      <GarageSlot />
      <nav aria-label="Previous and next step">
        <ul role="list">
          {previous === null ? null : (
            <li>
              <AppLink to={pathOf({ name: 'build', step: previous })} rel="prev">
                Previous: {BUILD_STEP_LABELS[previous]}
              </AppLink>
            </li>
          )}
          <li>
            {next === null ? (
              <AppLink to={pathOf({ name: 'results' })}>Next: Results</AppLink>
            ) : (
              <AppLink to={pathOf({ name: 'build', step: next })} rel="next">
                Next: {BUILD_STEP_LABELS[next]}
              </AppLink>
            )}
          </li>
        </ul>
      </nav>
      <nav aria-label="Build steps">
        <ol role="list">
          {BUILD_STEPS.map((candidate) => (
            <li key={candidate}>
              <AppLink
                to={pathOf({ name: 'build', step: candidate })}
                aria-current={candidate === step ? 'step' : undefined}
              >
                {BUILD_STEP_LABELS[candidate]}
              </AppLink>
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
