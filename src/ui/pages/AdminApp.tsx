import { StudentApp } from './StudentApp'
import { Sandbox } from '../sandbox/Sandbox'
import { VIPRtoNCCPanel } from '../sandbox/VIPRtoNCCPanel'

/**
 * Admin mode = everything in student mode plus the NCC sandbox, rendered
 * from the same store so plan edits and toggles stay one source of truth.
 */
export function AdminApp() {
  return (
    <StudentApp
      renderExtras={(store) =>
        store.augmented && (
          <>
            <Sandbox
              plan={store.augmented}
              viperMods={store.viperMods}
              distributionTargets={store.distributionTargets}
              onModsChange={store.setViperMods}
              onTargetsChange={store.setDistributionTargets}
            />
            <VIPRtoNCCPanel plan={store.augmented} viperMods={store.viperMods} />
          </>
        )
      }
    />
  )
}
