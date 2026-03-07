import time
from train import train_one_task, run_gradcam_on_samples, DEVICE, RESULTS_DIR

if __name__ == "__main__":
    start = time.time()
    print(f"Device: {DEVICE}")

    task = "benign_malignant"  # only the last category
    print(f"\n=== Training task: {task} ===")
    model, class_names, test_ds = train_one_task(task)
    run_gradcam_on_samples(model, class_names, test_ds, task_name=task, num_samples_per_class=3)

    print(f"\nTask completed. Results in: {RESULTS_DIR}")
    print(f"Total time: {(time.time() - start)/60:.1f} min")
