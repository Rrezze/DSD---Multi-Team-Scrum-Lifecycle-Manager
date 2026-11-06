import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

function Example() {
    return <h1>Frontend is working</h1>;
}

describe('Example component', () => {
    it('renders the heading correctly', () => {
        render(<Example />);

        expect(
            screen.getByRole('heading', { name: 'Frontend is working' })
        ).toBeInTheDocument();
    });
});