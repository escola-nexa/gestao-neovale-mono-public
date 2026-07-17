#!/bin/sh
max_iter=30
for i in $(seq 1 $max_iter); do
    echo "Iteration $i..."
    docker run --rm -v $(pwd):/app -w /app node:20-alpine sh -c "npx vite build" > vite_errors.log 2>&1
    if [ $? -eq 0 ]; then
        echo "Build succeeded!"
        break
    fi
    # Extract the file causing the esbuild error
    fail_file=$(grep -o "/app/src/[a-zA-Z0-9_./-]*\.tsx*" vite_errors.log | head -n 1)
    if [ -n "$fail_file" ]; then
        local_file=$(echo $fail_file | sed 's#/app/##')
        echo "Checking out $local_file..."
        git checkout $local_file
    else
        echo "No ts/tsx file found in error. Breaking."
        cat vite_errors.log
        break
    fi
done
