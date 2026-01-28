/**
 * Stress Test voor Holland Electric Afspraak Planner
 * Test alleen /schedule-appointment (geen side effects)
 */

const WEBHOOK_URL = 'https://digitalduke.app.n8n.cloud/webhook/schedule-appointment';

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Standaard aanvraag - Amersfoort',
    payload: {
      dealId: '285620829384',
      contactEmail: 'test@example.com',
      customerAddress: 'Stationsplein 1, 3818LE Amersfoort',
      preferences: [
        { date: '2026-02-10', timeSlot: '09:00', period: 'ochtend' },
        { date: '2026-02-11', timeSlot: '14:00', period: 'middag' }
      ]
    }
  },
  {
    name: 'Dichtbij monteur (Den Bosch)',
    payload: {
      dealId: '285620829384',
      contactEmail: 'test@example.com',
      customerAddress: 'Markt 1, 5211JV Den Bosch',
      preferences: [
        { date: '2026-02-12', timeSlot: '08:00', period: 'ochtend' },
        { date: '2026-02-12', timeSlot: '13:00', period: 'middag' }
      ]
    }
  },
  {
    name: 'Ver weg (Groningen)',
    payload: {
      dealId: '285620829384',
      contactEmail: 'test@example.com',
      customerAddress: 'Grote Markt 1, 9712HN Groningen',
      preferences: [
        { date: '2026-02-13', timeSlot: '10:00', period: 'ochtend' }
      ]
    }
  },
  {
    name: 'Meerdere voorkeuren',
    payload: {
      dealId: '285620829384',
      contactEmail: 'test@example.com',
      customerAddress: 'Oudegracht 100, 3511AX Utrecht',
      preferences: [
        { date: '2026-02-14', timeSlot: '08:00', period: 'ochtend' },
        { date: '2026-02-14', timeSlot: '12:00', period: 'middag' },
        { date: '2026-02-15', timeSlot: '09:00', period: 'ochtend' },
        { date: '2026-02-15', timeSlot: '14:00', period: 'middag' },
        { date: '2026-02-16', timeSlot: '10:00', period: 'ochtend' }
      ]
    }
  },
  {
    name: 'Vroege ochtend (08:00)',
    payload: {
      dealId: '285620829384',
      contactEmail: 'test@example.com',
      customerAddress: 'Eindhoven Centrum, 5611AA',
      preferences: [
        { date: '2026-02-17', timeSlot: '08:00', period: 'ochtend' }
      ]
    }
  },
  {
    name: 'Late middag (15:00)',
    payload: {
      dealId: '285620829384',
      contactEmail: 'test@example.com',
      customerAddress: 'Tilburg Centrum, 5038AA',
      preferences: [
        { date: '2026-02-18', timeSlot: '15:00', period: 'middag' }
      ]
    }
  },
  {
    name: 'Nederlandse datum format (dag maand)',
    payload: {
      dealId: '285620829384',
      contactEmail: 'test@example.com',
      customerAddress: 'Breda Centrum, 4811AA',
      preferences: [
        { date: '20 feb', timeSlot: '09:00', period: 'ochtend' },
        { date: '21 feb', timeSlot: '14:00', period: 'middag' }
      ]
    }
  },
  {
    name: 'Weekend aangrenzend (vrijdag)',
    payload: {
      dealId: '285620829384',
      contactEmail: 'test@example.com',
      customerAddress: 'Nijmegen Centrum, 6511AA',
      preferences: [
        { date: '2026-02-20', timeSlot: '09:00', period: 'ochtend' }
      ]
    }
  }
];

// Response validators - Updated for v2 response format
function validateSuggestionsResponse(response, scenarioName) {
  const errors = [];

  // Check basic structure
  if (typeof response !== 'object') {
    errors.push('Response is geen object');
    return errors;
  }

  // Check for v2 response format (hasSuggestions) or v1 (status)
  const hasV2Format = response.hasSuggestions !== undefined;
  const hasV1Format = response.status !== undefined;

  if (!hasV2Format && !hasV1Format) {
    errors.push('Geen hasSuggestions of status veld');
    return errors;
  }

  // For v2 format (direct from Scoring Algoritme)
  if (hasV2Format && response.hasSuggestions) {
    if (!Array.isArray(response.suggestions)) {
      errors.push('suggestions is geen array');
    } else if (response.suggestions.length > 0) {
      // Validate each suggestion
      response.suggestions.forEach((s, i) => {
        if (!s.date) errors.push(`suggestion[${i}]: geen date`);
        if (!s.timeSlot) errors.push(`suggestion[${i}]: geen timeSlot`);
        if (!s.endTime) errors.push(`suggestion[${i}]: geen endTime`);
        if (!s.monteur) errors.push(`suggestion[${i}]: geen monteur`);
        if (s.monteur && !s.monteur.id) errors.push(`suggestion[${i}]: monteur heeft geen id`);
        if (s.monteur && !s.monteur.naam) errors.push(`suggestion[${i}]: monteur heeft geen naam`);
        if (typeof s.score !== 'number') errors.push(`suggestion[${i}]: geen score`);
      });
    }
    // Check new v2 fields
    if (!response.matchType) errors.push('Geen matchType veld');
    if (!response.diagnostics) errors.push('Geen diagnostics veld');
    if (response.showContactButton === undefined) errors.push('Geen showContactButton veld');
  }

  // For v1 format (from Response - Suggesties node)
  if (hasV1Format && response.status === 'suggestions') {
    if (!response.message) errors.push('Geen "message" veld');
    if (!Array.isArray(response.suggestions)) {
      errors.push('suggestions is geen array');
    }
  }

  // For alternatives response
  if (response.success === false && response.hasAlternatives === true) {
    if (!Array.isArray(response.alternatives)) {
      errors.push('alternatives is geen array');
    }
  }

  // For manual handling response
  if (response.success === false && response.hasAlternatives === false) {
    if (!response.message) errors.push('Geen message voor handmatige afhandeling');
  }

  return errors;
}

async function runTest(scenario, index) {
  const startTime = Date.now();

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenario.payload)
    });

    const duration = Date.now() - startTime;
    const data = await response.json();
    const validationErrors = validateSuggestionsResponse(data, scenario.name);

    // Determine response type
    let responseType = 'unknown';
    if (data.status) {
      responseType = data.status;
    } else if (data.hasSuggestions !== undefined) {
      responseType = data.hasSuggestions ? `suggestions-${data.matchType || 'v2'}` : 'no-suggestions';
    } else if (data.success === false) {
      responseType = 'no-match';
    }

    return {
      scenario: scenario.name,
      index,
      success: response.ok && validationErrors.length === 0,
      httpStatus: response.status,
      duration,
      responseType,
      suggestionsCount: data.suggestions?.length || data.alternatives?.length || 0,
      matchType: data.matchType || null,
      warning: data.suggestions?.[0]?.warning || null,
      validationErrors,
      response: data
    };
  } catch (error) {
    return {
      scenario: scenario.name,
      index,
      success: false,
      httpStatus: 0,
      duration: Date.now() - startTime,
      responseType: 'error',
      suggestionsCount: 0,
      validationErrors: [error.message],
      response: null
    };
  }
}

async function runConcurrencyTest(concurrency = 5) {
  console.log(`\n🔄 Concurrency test: ${concurrency} parallelle requests...`);

  const scenario = TEST_SCENARIOS[0]; // Use standard scenario
  const promises = [];

  for (let i = 0; i < concurrency; i++) {
    promises.push(runTest(scenario, i));
  }

  const startTime = Date.now();
  const results = await Promise.all(promises);
  const totalDuration = Date.now() - startTime;

  const successful = results.filter(r => r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  return {
    concurrency,
    totalDuration,
    successful,
    failed: concurrency - successful,
    avgResponseTime: Math.round(avgDuration),
    results
  };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  STRESS TEST - Holland Electric Afspraak Planner');
  console.log('  Endpoint: /schedule-appointment (alleen lezen, geen bookings)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const allResults = [];

  // Phase 1: Sequential scenario tests
  console.log('📋 FASE 1: Scenario tests (sequentieel)\n');

  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    const scenario = TEST_SCENARIOS[i];
    process.stdout.write(`  [${i + 1}/${TEST_SCENARIOS.length}] ${scenario.name}... `);

    const result = await runTest(scenario, i);
    allResults.push(result);

    if (result.success) {
      console.log(`✅ ${result.duration}ms | ${result.suggestionsCount} suggesties`);
    } else {
      console.log(`❌ ${result.httpStatus} | ${result.validationErrors.join(', ')}`);
    }
  }

  // Phase 2: Concurrency tests
  console.log('\n📋 FASE 2: Concurrency tests\n');

  const concurrencyResults = [];
  for (const concurrency of [3, 5, 10]) {
    const result = await runConcurrencyTest(concurrency);
    concurrencyResults.push(result);

    const status = result.failed === 0 ? '✅' : '⚠️';
    console.log(`  ${status} ${concurrency} parallel: ${result.successful}/${concurrency} OK | avg ${result.avgResponseTime}ms | total ${result.totalDuration}ms`);
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  RESULTATEN SAMENVATTING');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const scenarioSuccess = allResults.filter(r => r.success).length;
  const scenarioFailed = allResults.filter(r => !r.success);

  console.log(`📊 Scenario tests: ${scenarioSuccess}/${allResults.length} geslaagd`);

  if (scenarioFailed.length > 0) {
    console.log('\n❌ Gefaalde scenario\'s:');
    scenarioFailed.forEach(r => {
      console.log(`   - ${r.scenario}: ${r.validationErrors.join(', ')}`);
    });
  }

  console.log('\n📊 Concurrency tests:');
  concurrencyResults.forEach(r => {
    console.log(`   - ${r.concurrency} parallel: ${r.successful}/${r.concurrency} OK (avg ${r.avgResponseTime}ms)`);
  });

  // Response type distribution
  const responseTypes = {};
  allResults.forEach(r => {
    responseTypes[r.responseType] = (responseTypes[r.responseType] || 0) + 1;
  });

  console.log('\n📊 Response types:');
  Object.entries(responseTypes).forEach(([type, count]) => {
    console.log(`   - ${type}: ${count}x`);
  });

  // Performance stats
  const durations = allResults.map(r => r.duration);
  console.log('\n📊 Performance:');
  console.log(`   - Min: ${Math.min(...durations)}ms`);
  console.log(`   - Max: ${Math.max(...durations)}ms`);
  console.log(`   - Avg: ${Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)}ms`);

  // Detailed results
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  GEDETAILLEERDE RESPONSES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  allResults.forEach((r, i) => {
    console.log(`\n--- ${i + 1}. ${r.scenario} ---`);
    console.log(`Status: ${r.success ? '✅ OK' : '❌ FAILED'}`);
    console.log(`HTTP: ${r.httpStatus} | Duration: ${r.duration}ms`);
    console.log(`Response type: ${r.responseType}`);

    if (r.response?.suggestions) {
      console.log(`Suggestions (${r.response.suggestions.length}):`);
      r.response.suggestions.forEach((s, j) => {
        console.log(`  ${j + 1}. ${s.date} ${s.timeSlot}-${s.endTime} | ${s.monteur?.naam} | score: ${s.score}`);
      });
    }

    if (r.validationErrors.length > 0) {
      console.log(`Validation errors: ${r.validationErrors.join(', ')}`);
    }
  });

  // Final verdict
  const totalTests = allResults.length + concurrencyResults.reduce((sum, r) => sum + r.concurrency, 0);
  const totalSuccess = scenarioSuccess + concurrencyResults.reduce((sum, r) => sum + r.successful, 0);

  console.log('\n═══════════════════════════════════════════════════════════════');
  if (totalSuccess === totalTests) {
    console.log('  ✅ ALLE TESTS GESLAAGD');
  } else {
    console.log(`  ⚠️  ${totalTests - totalSuccess} VAN ${totalTests} TESTS GEFAALD`);
  }
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Return results for further analysis
  return { allResults, concurrencyResults };
}

main().catch(console.error);
