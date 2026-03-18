import { NextResponse } from 'next/server';

const TOGETHER_API_BASE = 'https://api.together.xyz/v1';

/**
 * Create a fine-tuning job on Together AI
 */
export async function POST(request, { params }) {
  try {
    const {
      apiKey,
      fileId,
      model,
      nEpochs,
      learningRate,
      batchSize,
      suffix,
      loraRank,
      loraAlpha,
      loraDropout
    } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'Together AI API Key is required' }, { status: 400 });
    }
    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }
    if (!model) {
      return NextResponse.json({ error: 'Model is required' }, { status: 400 });
    }

    const jobParams = {
      model,
      training_file: fileId,
      n_epochs: nEpochs || 3,
      learning_rate: learningRate || 1e-5,
      batch_size: Math.max(batchSize || 8, 8),
      suffix: suffix || undefined,
      lora: true,
      n_checkpoints: 1,
    };

    const response = await fetch(`${TOGETHER_API_BASE}/fine-tunes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(jobParams),
    });

    const job = await response.json();

    if (!response.ok) {
      throw new Error(job.error?.message || job.message || JSON.stringify(job));
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        model: job.model,
        status: job.status,
        createdAt: job.created_at
      }
    });
  } catch (error) {
    console.error('Together AI fine-tune creation failed:', String(error));
    return NextResponse.json(
      { error: error.message || 'Failed to create fine-tuning job' },
      { status: 500 }
    );
  }
}

/**
 * List all fine-tuning jobs
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey');

    if (!apiKey) {
      return NextResponse.json({ error: 'Together AI API Key is required' }, { status: 400 });
    }

    const response = await fetch(`${TOGETHER_API_BASE}/fine-tunes`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || data.message || 'Failed to list jobs');
    }

    return NextResponse.json({
      jobs: data.data || data
    });
  } catch (error) {
    console.error('Together AI list jobs failed:', String(error));
    return NextResponse.json(
      { error: error.message || 'Failed to list fine-tuning jobs' },
      { status: 500 }
    );
  }
}
