import { NextResponse } from 'next/server';

const TOGETHER_API_BASE = 'https://api.together.xyz/v1';

/**
 * Get fine-tuning job details and events
 */
export async function GET(request, { params }) {
  try {
    const { jobId } = params;
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey');

    if (!apiKey) {
      return NextResponse.json({ error: 'Together AI API Key is required' }, { status: 400 });
    }

    const jobResponse = await fetch(`${TOGETHER_API_BASE}/fine-tunes/${jobId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    const job = await jobResponse.json();

    if (!jobResponse.ok) {
      throw new Error(job.error?.message || job.message || 'Failed to get job');
    }

    let events = [];
    try {
      const eventsResponse = await fetch(`${TOGETHER_API_BASE}/fine-tunes/${jobId}/events`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        events = eventsData.data || eventsData || [];
      }
    } catch (e) {
      // Events may not be available yet
    }

    return NextResponse.json({
      job: {
        id: job.id,
        model: job.model,
        status: job.status,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        outputName: job.output_name,
        trainingFile: job.training_file,
        nEpochs: job.n_epochs,
        learningRate: job.learning_rate,
        batchSize: job.batch_size
      },
      events
    });
  } catch (error) {
    console.error('Together AI get job failed:', String(error));
    return NextResponse.json(
      { error: error.message || 'Failed to get fine-tuning job details' },
      { status: 500 }
    );
  }
}

/**
 * Cancel a fine-tuning job
 */
export async function DELETE(request, { params }) {
  try {
    const { jobId } = params;
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey');

    if (!apiKey) {
      return NextResponse.json({ error: 'Together AI API Key is required' }, { status: 400 });
    }

    const response = await fetch(`${TOGETHER_API_BASE}/fine-tunes/${jobId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || data.message || 'Failed to cancel job');
    }

    return NextResponse.json({ success: true, status: data.status });
  } catch (error) {
    console.error('Together AI cancel job failed:', String(error));
    return NextResponse.json(
      { error: error.message || 'Failed to cancel fine-tuning job' },
      { status: 500 }
    );
  }
}
