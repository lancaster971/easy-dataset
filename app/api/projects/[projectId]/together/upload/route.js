import { NextResponse } from 'next/server';
import { getProject } from '@/lib/db/projects';
import { getDatasets } from '@/lib/db/datasets';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TOGETHER_API_BASE = 'https://api.together.xyz/v1';

/**
 * Upload dataset to Together AI as JSONL file for fine-tuning.
 * Uses 3-step flow: init → upload to R2 via curl → preprocess
 * (Node.js fetch has issues with R2 presigned URL uploads)
 */
export async function POST(request, { params }) {
  let tempDir = null;

  try {
    const projectId = params.projectId;
    const {
      apiKey,
      systemPrompt,
      confirmedOnly,
      includeCOT
    } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'Together AI API Key is required' }, { status: 400 });
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const datasets = await getDatasets(projectId, confirmedOnly);
    if (!datasets || datasets.length === 0) {
      return NextResponse.json({ error: 'No datasets available for export' }, { status: 400 });
    }

    // Format as ShareGPT JSONL (Together AI chat format)
    const jsonlLines = datasets.map(q => {
      const messages = [];

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }

      messages.push({ role: 'user', content: q.question });

      const assistantContent = includeCOT && q.cot
        ? `<think>${q.cot}</think>\n${q.answer}`
        : q.answer;
      messages.push({ role: 'assistant', content: assistantContent });

      return JSON.stringify({ messages });
    });

    const jsonlContent = jsonlLines.join('\n');
    const safeProjectName = (project.name || 'dataset').replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `${safeProjectName}-finetune.jsonl`;

    // Write to temp file for curl upload
    tempDir = path.join(os.tmpdir(), `together-upload-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, fileName);
    fs.writeFileSync(tempFilePath, jsonlContent);

    // Step 1: Request presigned upload URL from Together AI
    const initParams = new URLSearchParams({
      file_name: fileName,
      file_type: 'jsonl',
      purpose: 'fine-tune',
    });

    const initResponse = await fetch(`${TOGETHER_API_BASE}/files?${initParams}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${apiKey}`,
      },
      redirect: 'manual',
      body: initParams.toString(),
    });

    if (initResponse.status !== 302) {
      const errorText = await initResponse.text().catch(() => '');
      throw new Error(`Failed to initiate upload (status ${initResponse.status}): ${errorText}`);
    }

    const uploadUrl = initResponse.headers.get('location');
    const fileId = initResponse.headers.get('x-together-file-id');

    if (!uploadUrl || !fileId) {
      throw new Error('Failed to get upload URL or file ID from Together AI');
    }

    // Step 2: Upload file to R2 via curl (Node.js fetch has streaming issues with R2)
    try {
      execSync(
        `curl -s -f --upload-file "${tempFilePath}" -H "Content-Type: application/octet-stream" "${uploadUrl}"`,
        { timeout: 60000 }
      );
    } catch (curlError) {
      throw new Error('Failed to upload file to storage');
    }

    // Step 3: Trigger preprocessing (required for Together AI to process the file)
    const preprocessResponse = await fetch(`${TOGETHER_API_BASE}/files/${fileId}/preprocess`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!preprocessResponse.ok) {
      throw new Error('Failed to trigger file preprocessing');
    }

    const file = await preprocessResponse.json();

    return NextResponse.json({
      success: true,
      file: {
        id: file.id || fileId,
        filename: file.filename || fileName,
        bytes: file.bytes || Buffer.byteLength(jsonlContent),
        purpose: file.purpose || 'fine-tune',
        createdAt: file.created_at,
        lineCount: datasets.length
      }
    });
  } catch (error) {
    console.error('Together AI upload failed:', String(error));
    return NextResponse.json(
      { error: error.message || 'Failed to upload to Together AI' },
      { status: 500 }
    );
  } finally {
    if (tempDir) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) { /* ignore */ }
    }
  }
}
