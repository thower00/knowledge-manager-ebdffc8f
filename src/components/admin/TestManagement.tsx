
// This file now just re-exports the main component from its new location
// to maintain backward compatibility for imports
import { TestManagement as TestManagementComponent } from "./test-management/TestManagementContainer";

export { TestManagementComponent as TestManagement };
