#!/usr/bin/env node

/**
 * Generate a coverage badge for the README
 * Run with: node scripts/generate-coverage-badge.js
 */

import fs from 'fs';
import path from 'path';

function generateCoverageBadge() {
  try {
    // Read the coverage summary
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-final.json');
    
    if (!fs.existsSync(coveragePath)) {
      console.log('Coverage report not found. Run "pnpm test:coverage" first.');
      return;
    }

    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    
    // Calculate coverage from the coverage-final.json format
    let totalStatements = 0;
    let coveredStatements = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalLines = 0;
    let coveredLines = 0;

    // Process each file's coverage data
    Object.values(coverageData).forEach((fileData) => {
      if (fileData.s) {
        // Statements
        Object.values(fileData.s).forEach((hit) => {
          totalStatements++;
          if (hit > 0) coveredStatements++;
        });
      }
      
      if (fileData.f) {
        // Functions
        Object.values(fileData.f).forEach((hit) => {
          totalFunctions++;
          if (hit > 0) coveredFunctions++;
        });
      }
      
      if (fileData.b) {
        // Branches
        Object.values(fileData.b).forEach((hits) => {
          if (Array.isArray(hits)) {
            totalBranches += hits.length;
            hits.forEach((hit) => {
              if (hit > 0) coveredBranches++;
            });
          }
        });
      }
      
      if (fileData.l) {
        // Lines (approximate from statements)
        totalLines += Object.keys(fileData.s || {}).length;
        coveredLines += Object.values(fileData.s || {}).filter((hit) => hit > 0).length;
      }
    });

    // Calculate percentages
    const statementsPct = totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0;
    const functionsPct = totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0;
    const branchesPct = totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0;
    const linesPct = totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0;
    
    // Calculate overall coverage percentage
    const percentage = Math.round(
      (statementsPct + functionsPct + branchesPct + linesPct) / 4
    );
    
    // Determine badge color
    let color = 'red';
    if (percentage >= 80) color = 'brightgreen';
    else if (percentage >= 60) color = 'yellow';
    else if (percentage >= 40) color = 'orange';
    
    // Generate badge URL
    const badgeUrl = `https://img.shields.io/badge/coverage-${percentage}%25-${color}`;
    
    // Create badge markdown
    const badgeMarkdown = `![Test Coverage](${badgeUrl})`;
    
    // Update README.md with the new badge
    const readmePath = path.join(process.cwd(), 'README.md');
    let readmeContent = fs.readFileSync(readmePath, 'utf8');
    
    // Replace existing badge or add new one after the title
    const badgeRegex = /!\[Test Coverage\]\(https:\/\/img\.shields\.io\/badge\/coverage-\d+%25-\w+\)/;
    if (badgeRegex.test(readmeContent)) {
      // Replace existing badge
      readmeContent = readmeContent.replace(badgeRegex, badgeMarkdown);
    } else {
      // Add badge after the description line
      const descriptionRegex = /(A Next\.js application for tracking Nuzlocke runs in Pokémon Infinite Fusion, featuring fusion mechanics, encounter tracking, and comprehensive run management\.)/;
      readmeContent = readmeContent.replace(descriptionRegex, `$1\n\n${badgeMarkdown}`);
    }
    
    fs.writeFileSync(readmePath, readmeContent);
    
    console.log(`✅ Coverage badge updated in README.md: ${percentage}%`);
    console.log(`🔗 Badge URL: ${badgeUrl}`);
    
    // Also log detailed coverage
    console.log('\n📊 Detailed Coverage:');
    console.log(`   Lines: ${linesPct}% (${coveredLines}/${totalLines})`);
    console.log(`   Functions: ${functionsPct}% (${coveredFunctions}/${totalFunctions})`);
    console.log(`   Branches: ${branchesPct}% (${coveredBranches}/${totalBranches})`);
    console.log(`   Statements: ${statementsPct}% (${coveredStatements}/${totalStatements})`);
    
  } catch (error) {
    console.error('❌ Error generating coverage badge:', error.message);
    process.exit(1);
  }
}

generateCoverageBadge();
