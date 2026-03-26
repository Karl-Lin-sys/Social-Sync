/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiKeyGate } from './components/ApiKeyGate';
import { ContentGenerator } from './components/ContentGenerator';

export default function App() {
  return (
    <ApiKeyGate>
      <ContentGenerator />
    </ApiKeyGate>
  );
}
